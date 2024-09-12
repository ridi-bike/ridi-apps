import "@ridi/server-client-check/server-only";
import type { prismaClient } from "@ridi/database";

type DbTrans = Parameters<Parameters<typeof prismaClient.$transaction>[0]>[0];
type DbCon = typeof prismaClient;

export type Db = DbCon | DbTrans;
