import {
  createClient,
  REALTIME_CHANNEL_STATES,
  RealtimeChannel,
  SupabaseClient,
} from "jsr:@supabase/supabase-js";
import { Database } from "../../../supabase/functions/trpc/types.ts";
import { EnvVariables } from "./env-variables.ts";
import { object, parse, string } from "jsr:@valibot/valibot@0.42.1";
import { RidiLogger } from "../lib/logger.ts";

export class Supabase {
  private readonly supabase: SupabaseClient<Database>;
  private plansChannel: RealtimeChannel | null = null;

  constructor(
    private readonly env: EnvVariables,
    private readonly logger: RidiLogger,
  ) {
    this.supabase = createClient<Database>(
      this.env.supabaseUrl,
      this.env.supabaseSecretKey,
    );
  }

  async listen(listenerCallback: (id: string) => void) {
    await new Promise<void>((resolve, reject) => {
      this.plansChannel = this.supabase
        .channel("plans_routes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "plans",
          },
          (payload) => {
            this.logger.debug("Received payload", { payload });
            const row = parse(
              object({
                new: object({
                  id: string(),
                }),
              }),
              payload,
            );
            listenerCallback(row.new.id);
          },
        )
        .subscribe((state, err) => {
          if (err) {
            reject(err);
          }
          if (state === "SUBSCRIBED") {
            resolve();
          } else {
            reject(new Error(`state ${state}`));
          }
        });
    });

    this.logger.debug("Plans Subscription created");

    return () => this.plansChannel?.unsubscribe();
  }

  isListening() {
    return !!this.plansChannel &&
      this.plansChannel.state === REALTIME_CHANNEL_STATES.joined;
  }
}
