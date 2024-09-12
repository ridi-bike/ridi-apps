import { getEnvVariables } from "./env-vars";

export const isLocalDev = () => {
  return getEnvVariables().RIDI_ENV === "local";
};
