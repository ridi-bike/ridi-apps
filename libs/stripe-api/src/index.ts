import {
  privateUserInsert,
  privateUsersGetRow,
  privateUsersGetRowByStripeCustomerId,
  privateUsersUpdateCompleted,
  privateUsersUpdateInitiated,
  privateUsersUpdateStripeCustomerId,
  privateUsersUpdateStripeData,
  privateUsersUpdateStripeStatusNone,
} from "@ridi/db-queries";
import { type RidiLogger } from "@ridi/logger";
import Stripe from "stripe";

const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

export class StripeApi {
  private readonly dbClient: Parameters<typeof privateUsersGetRow>[0];
  private readonly logger: RidiLogger;
  private readonly stripe: Stripe;
  private readonly appBaseUrl: string;
  private readonly priceMontly: string;
  private readonly priceYearly: string;
  private readonly stripeWebhookSecret?: string;

  constructor(
    dbClient: Parameters<typeof privateUsersGetRow>[0],
    logger: RidiLogger,
    stripeSecretKey: string,
    appBaseUrl: string,
    priceMontly: string,
    priceYearly: string,
    stripeWebhookSecret?: string,
  ) {
    this.dbClient = dbClient;
    this.logger = logger.withContext({ module: "stripe-api" });
    this.stripe = new Stripe(stripeSecretKey);
    this.appBaseUrl = appBaseUrl;
    this.priceMontly = priceMontly;
    this.priceYearly = priceYearly;
    this.stripeWebhookSecret = stripeWebhookSecret;
  }
  async createStripeCheckoutUrl(
    user: { id: string; email: string },
    priceType: "montly" | "yearly",
  ) {
    this.logger.info("Creating Stripe checkout", { userId: user.id });
    let privateUser = await privateUsersGetRow(this.dbClient, {
      userId: user.id,
    });

    if (!privateUser) {
      privateUser = await privateUserInsert(this.dbClient, {
        userId: user.id,
      });
    }

    if (privateUser?.subType !== "none") {
      throw this.logger.error("Subscription already in place", { privateUser });
    }

    let stripeCustomerId = privateUser?.stripeCustomerId || "";

    if (!privateUser.stripeCustomerId) {
      this.logger.info("Creating stripe customer", { userId: user.id });
      const newCustomer = await this.stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      await privateUsersUpdateStripeCustomerId(this.dbClient, {
        stripeCustomerId: newCustomer.id,
        userId: user.id,
      });
      stripeCustomerId = newCustomer.id;
    }

    const checkout = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      success_url: `${this.appBaseUrl}/settings/billing?stripe=true`,
      mode: "subscription",
      line_items: [
        {
          price: priceType === "montly" ? this.priceMontly : this.priceYearly,
          quantity: 1,
        },
      ],
    });

    await privateUsersUpdateInitiated(this.dbClient, {
      userId: user.id,
      stripeCheckoutId: checkout.id,
    });

    const url = checkout.url;

    if (!url) {
      throw this.logger.error("Checkout session not containing redirect url", {
        checkout,
      });
    }

    return url;
  }

  async syncStripeData({ type, id }: { type: "stripe" | "ridi"; id: string }) {
    this.logger.info("Sync stripe data", { type, id });

    const privateUser =
      type === "ridi"
        ? await privateUsersGetRow(this.dbClient, {
            userId: id,
          })
        : await privateUsersGetRowByStripeCustomerId(this.dbClient, {
            stripeCustomerId: id,
          });

    if (!privateUser) {
      throw this.logger.error("Missing Stripe user, it must exist", {
        type,
        id,
      });
    }

    const userId = privateUser.userId;

    if (privateUser.stripeFlowStatus === "initiated") {
      await privateUsersUpdateCompleted(this.dbClient, {
        userId,
      });
    }

    if (!privateUser.stripeCustomerId) {
      throw this.logger.error("Stripe customer id is missing", { privateUser });
    }

    const subscriptions = await this.stripe.subscriptions.list({
      customer: privateUser.stripeCustomerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    if (subscriptions.data.length === 0) {
      this.logger.info("Stripe data no subscriptions", { userId });

      await privateUsersUpdateStripeStatusNone(this.dbClient, {
        userId,
      });

      return false;
    }

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw this.logger.error("Subscription not found, checked length before", {
        userId,
        subscriptions,
      });
    }

    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) {
      throw this.logger.error("Price id missing in stripe data, must exist", {
        userId,
        subscriptions,
      });
    }

    await privateUsersUpdateStripeData(this.dbClient, {
      stripeSubscriptionId: subscription.id,
      stripeStatus: subscription.status,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      stripeCurrentPeriodStart: new Date(
        subscription.current_period_start * 1000,
      ),
      stripeCancelAtPeriodEnd:
        subscription.cancel_at_period_end as unknown as string, // sqlc bug for specifying boolean
      stripePaymentMethod:
        subscription.default_payment_method &&
        typeof subscription.default_payment_method !== "string"
          ? `${subscription.default_payment_method.card?.brand} ${subscription.default_payment_method.card?.last4}`
          : typeof subscription.default_payment_method === "string"
            ? subscription.default_payment_method
            : null,
      userId,
      subType: subscription.status === "active" ? "stripe" : "none",
    });

    return true;
  }

  async processWebhook(
    request: Request,
    waitUntil: (promise: Promise<unknown>) => void,
  ) {
    this.logger.info("Stripe webhook call");

    if (!this.stripeWebhookSecret) {
      throw this.logger.error("Stripe webhook secret missing");
    }

    const body = await request.text();
    const signature = request.headers.get("Stripe-Signature");

    if (!signature) {
      return new Response(JSON.stringify({}), {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    const processPayload = async () => {
      if (typeof signature !== "string") {
        throw this.logger.error("Stripe webhook signature is not a string");
      }

      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.stripeWebhookSecret!,
      );

      if (!allowedEvents.includes(event.type)) {
        return;
      }

      // All tracked events should have a customer
      const { customer: customerId } = event?.data?.object as {
        customer?: string;
      };

      if (typeof customerId !== "string") {
        throw this.logger.error(
          "Stripe webhook event did not contain a customer",
          { type: event.type },
        );
      }

      await this.syncStripeData({ type: "stripe", id: customerId });
    };

    waitUntil(processPayload());

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  async getStripeBillingPortalSessionUrl(user: { id: string }) {
    this.logger.info("Creating Stripe Billing Portal Session", {
      userId: user.id,
    });
    const privateUser = await privateUsersGetRow(this.dbClient, {
      userId: user.id,
    });

    if (!privateUser?.stripeCustomerId) {
      return null;
    }

    const portal = await this.stripe.billingPortal.sessions.create({
      customer: privateUser.stripeCustomerId,
    });

    return portal.url;
  }

  async getPrices() {
    const [montlyPrice, yearlyPrice] = await Promise.all([
      this.stripe.prices.retrieve(this.priceMontly),
      this.stripe.prices.retrieve(this.priceYearly),
    ]);
    if (!montlyPrice.unit_amount || !yearlyPrice.unit_amount) {
      this.logger.error("Price unit_amount missing", {
        montlyPrice,
        yearlyPrice,
      });
      return [];
    }
    return [
      {
        id: this.priceMontly,
        priceType: "montly",
        price: montlyPrice.unit_amount / 100,
        priceMontly: montlyPrice.unit_amount / 100,
      } as const,
      {
        id: this.priceYearly,
        priceType: "yearly",
        price: yearlyPrice.unit_amount / 100,
        priceMontly:
          Math.round((yearlyPrice.unit_amount / 100 / 12) * 100) / 100,
      } as const,
    ];
  }
}
