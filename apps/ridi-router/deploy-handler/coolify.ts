import { EnvVariables } from "./env.ts";
export class CoolifyClient {
  private env: EnvVariables;

  constructor(env: EnvVariables) {
    this.env = env;
  }

  private async runRealOrFake<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.env.ridiEnv === "local") {
      return null;
    }
    return await fn();
  }

  async deployRouterHandler(): Promise<void> {
    await this.runRealOrFake(() =>
      fetch(
        `${this.env.coolifyUrl}/deploy?uuid=${this.env.coolifyIdRouterHandler}`,
        {
          headers: {
            Authorization: `Bearer ${this.env.coolifyToken}`,
          },
        },
      )
    );
  }

  async deployMapDataHandler(): Promise<void> {
    await this.runRealOrFake(() =>
      fetch(
        `${this.env.coolifyUrl}/deploy?uuid=${this.env.coolifyIdMapDataHandler}`,
        {
          headers: {
            Authorization: `Bearer ${this.env.coolifyToken}`,
          },
        },
      )
    );
  }
}
