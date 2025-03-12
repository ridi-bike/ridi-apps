import {
  stripeUsersGetRow,
  stripeUsersGetRowByStripeCustomerId,
  stripeUsersInsertWithCustomerId,
  stripeUsersUpdateCompleted,
  stripeUsersUpdateInitiated,
  stripeUsersUpdateStripeData,
  stripeUsersUpdateStripeStatusNone,
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
  private readonly dbClient: Parameters<typeof stripeUsersGetRow>[0];
  private readonly logger: RidiLogger;
  private readonly stripe: Stripe;
  private readonly appBaseUrl: string;
  private readonly priceMontly: string;
  private readonly priceYearly: string;
  private readonly stripeWebhookSecret?: string;

  constructor(
    dbClient: Parameters<typeof stripeUsersGetRow>[0],
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
    const stripeUser = await stripeUsersGetRow(this.dbClient, {
      userId: user.id,
    });

    let stripeCustomerId = stripeUser?.stripeCustomerId || "";

    if (!stripeUser) {
      this.logger.info("Creating stripe customer", { userId: user.id });
      const newCustomer = await this.stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      await stripeUsersInsertWithCustomerId(this.dbClient, {
        stripeCustomerId: newCustomer.id,
        userId: user.id,
      });
      stripeCustomerId = newCustomer.id;
    }

    const checkout = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      success_url: `${this.appBaseUrl}/stripe-success`,
      mode: "subscription",
      line_items: [
        {
          price: priceType === "montly" ? this.priceMontly : this.priceYearly,
          quantity: 1,
        },
      ],
    });

    await stripeUsersUpdateInitiated(this.dbClient, {
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

    const stripeUser =
      type === "ridi"
        ? await stripeUsersGetRow(this.dbClient, {
            userId: id,
          })
        : await stripeUsersGetRowByStripeCustomerId(this.dbClient, {
            stripeCustomerId: id,
          });

    if (!stripeUser) {
      throw this.logger.error("Missing Stripe user, it must exist", {
        type,
        id,
      });
    }

    const userId = stripeUser.userId;

    if (stripeUser.flowStatus === "initiated") {
      await stripeUsersUpdateCompleted(this.dbClient, {
        userId,
      });
    }

    const subscriptions = await this.stripe.subscriptions.list({
      customer: stripeUser.stripeCustomerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    if (subscriptions.data.length === 0) {
      this.logger.info("Stripe data no subscriptions", { userId });

      await stripeUsersUpdateStripeStatusNone(this.dbClient, {
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

    await stripeUsersUpdateStripeData(this.dbClient, {
      stripeSubscriptionId: subscription.id,
      stripeStatus: subscription.status,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end),
      stripeCurrentPeriodStart: new Date(subscription.current_period_start),
      stripeCancelAtPeriodEnd: subscription.cancel_at_period_end.toString(),
      stripePaymentMethod:
        subscription.default_payment_method &&
        typeof subscription.default_payment_method !== "string"
          ? `${subscription.default_payment_method.card?.brand} ${subscription.default_payment_method.card?.last4}`
          : typeof subscription.default_payment_method === "string"
            ? subscription.default_payment_method
            : null,
      userId,
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
}
