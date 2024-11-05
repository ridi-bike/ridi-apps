import { observable } from "@legendapp/state";
import type { Session } from "@supabase/supabase-js";

export const session$ = observable<Session | null>(null);
