import { type Session } from "@supabase/supabase-js";
import { atom } from "nanostores";

export const $session = atom<Session | null>(null);
