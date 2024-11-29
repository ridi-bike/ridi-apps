import { assertSpyCalls, spy } from "jsr:@std/testing/mock";
import { DeployChecker } from "./check-deploy.ts";
import { getDb, RidiLogger } from "@ridi-router/lib";
import { CoolifyClient } from "./coolify.ts";
import { EnvVariables } from "./env.ts";

// Mock dependencies
const mockDb = {
  handlers: {
    updateRecordProcessing: () => {},
    updateRecordDone: () => {},
    get: () => ({}),
  },
} as unknown as ReturnType<typeof getDb>;

const mockCoolify = {
  deployMapDataHandler: () => Promise.resolve(),
  deployRouterHandler: () => Promise.resolve(),
} as CoolifyClient;

const mockEnvVariables = {
  routerVersion: "1.0.0",
} as EnvVariables;

const mockLogger = {
  debug: (..._args: unknown[]) => undefined,
} as RidiLogger;

Deno.test("DeployChecker - should not deploy if conditions are not met", async () => {
  const checker = new DeployChecker(
    mockDb,
    mockCoolify,
    mockEnvVariables,
    mockLogger,
  );

  const coolifyMapDataSpy = spy(mockCoolify, "deployMapDataHandler");
  const coolifyRouterSpy = spy(mockCoolify, "deployRouterHandler");

  await checker.checkDeploy();

  assertSpyCalls(coolifyMapDataSpy, 0);
  assertSpyCalls(coolifyRouterSpy, 0);

  coolifyMapDataSpy.restore();
  coolifyRouterSpy.restore();
});

Deno.test("DeployChecker - should deploy map data handler when status is done", async () => {
  const testDb = {
    ...mockDb,
    handlers: {
      ...mockDb.handlers,
      get: (type: string) => type === "map-data" ? { status: "done" } : {},
    },
  };

  const checker = new DeployChecker(
    testDb as ReturnType<typeof getDb>,
    mockCoolify,
    mockEnvVariables,
    mockLogger,
  );

  const coolifyMapDataSpy = spy(mockCoolify, "deployMapDataHandler");
  await checker.checkDeploy();

  assertSpyCalls(coolifyMapDataSpy, 1);

  coolifyMapDataSpy.restore();
});

Deno.test("DeployChecker - should deploy router handler when all conditions are met", async () => {
  const testDb = {
    ...mockDb,
    handlers: {
      ...mockDb.handlers,
      get: (_type: string) => ({
        status: "done",
        router_version: "1.0.0",
      }),
    },
  };

  const checker = new DeployChecker(
    testDb as ReturnType<typeof getDb>,
    mockCoolify,
    mockEnvVariables,
    mockLogger,
  );

  const coolifyRouterSpy = spy(mockCoolify, "deployRouterHandler");
  // Then check for router handler deployment
  await checker.checkDeploy();

  assertSpyCalls(coolifyRouterSpy, 1);

  coolifyRouterSpy.restore();
});

Deno.test("DeployChecker - should clear interval when both deployments are done", async () => {
  const testDb = {
    ...mockDb,
    handlers: {
      ...mockDb.handlers,
      get: (type: string) => ({
        status: "done",
        router_version: "1.0.0",
      }),
    },
  };

  const checker = new DeployChecker(
    testDb as ReturnType<typeof getDb>,
    mockCoolify,
    mockEnvVariables,
    mockLogger,
  );

  checker.start();
  await checker.checkDeploy();
  await checker.checkDeploy();

  const dbUpdateDoneSpy = spy(testDb.handlers, "updateRecordDone");
  await checker.checkDeploy();

  assertSpyCalls(dbUpdateDoneSpy, 1);

  dbUpdateDoneSpy.restore();
});
