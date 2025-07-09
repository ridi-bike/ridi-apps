import {
  planUpsert,
  ruleSetRoadTagsUpsert,
  ruleSetUpsert,
} from "@ridi/db-queries";
import { storeSchema } from "@ridi/store-with-schema";
import type postgres from "postgres";
import { z } from "zod";

const recordSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export const notifyPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INSERT"),
    table: z.string(),
    schema: z.string(),
    record: recordSchema,
    old_record: z.null(),
  }),
  z.object({
    type: z.literal("UPDATE"),
    table: z.string(),
    schema: z.string(),
    record: recordSchema,
    old_record: recordSchema,
  }),
  z.object({
    type: z.literal("DELETE"),
    table: z.string(),
    schema: z.string(),
    record: z.null(),
    old_record: recordSchema,
  }),
]);

const planReadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  modifiedAt: z.date().nullable(),
  startLat: z.string(),
  startLon: z.string(),
  finishLat: z.string().nullable(),
  finishLon: z.string().nullable(),
  state: z.union([
    z.literal("new"),
    z.literal("planning"),
    z.literal("planning-wider"),
    z.literal("done"),
    z.literal("error"),
  ]),
  name: z.string(),
  error: z.string().nullable(),
  tripType: z.union([z.literal("round-trip"), z.literal("start-finish")]),
  distance: z.string(),
  bearing: z.string().nullable(),
  startDesc: z.string(),
  finishDesc: z.string().nullable(),
  ruleSetId: z.string(),
  region: z.string().nullable(),
  isDeleted: z.boolean(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
});

const routeReadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  planId: z.string(),
  name: z.string(),
  linestring: z.string().nullable(),
  statsLenM: z.string(),
  statsScore: z.string(),
  statsJunctionCount: z.string(),
  isDeleted: z.boolean(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
  downloadedAt: z.date().nullable(),
  latLonArray: z.array(z.string()),
});

const routeBreakdoiwnStatReadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  routeId: z.string(),
  statType: z.union([
    z.literal("type"),
    z.literal("surface"),
    z.literal("smoothness"),
  ]),
  statName: z.string(),
  lenM: z.string(),
  percentage: z.string(),
  id_2: z.string(),
  userId_2: z.string(),
  createdAt: z.date(),
  planId: z.string(),
  name: z.string(),
  linestring: z.string().nullable(),
  statsLenM: z.string(),
  statsScore: z.string(),
  statsJunctionCount: z.string(),
  isDeleted: z.boolean(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
  downloadedAt: z.date().nullable(),
});

const ruleSetReadSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  name: z.string(),
  defaultSet: z.boolean(),
  isDeleted: z.boolean(),
  icon: z
    .union([z.literal("touring"), z.literal("dualsport"), z.literal("adv")])
    .nullable(),
});

const ruleSetRoadTagsReadSchema = z.object({
  userId: z.string().nullable(),
  ruleSetId: z.string(),
  tagKey: z.string(),
  value: z.number().nullable(),
});

const regionReadSchema = z.object({
  region: z.string(),
  geojson: z.unknown(),
});

const planWriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  modifiedAt: z.date().nullable(),
  startLat: z.string(),
  startLon: z.string(),
  finishLat: z.string().nullable(),
  finishLon: z.string().nullable(),
  state: z.union([
    z.literal("new"),
    z.literal("planning"),
    z.literal("planning-wider"),
    z.literal("done"),
    z.literal("error"),
  ]),
  name: z.string(),
  error: z.string().nullable(),
  tripType: z.union([z.literal("round-trip"), z.literal("start-finish")]),
  distance: z.string(),
  bearing: z.string().nullable(),
  startDesc: z.string(),
  finishDesc: z.string().nullable(),
  ruleSetId: z.string(),
  region: z.string().nullable(),
  isDeleted: z.boolean(),
  mapPreviewLight: z.string().nullable(),
  mapPreviewDark: z.string().nullable(),
});

const ruleSetWriteSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  name: z.string(),
});

const ruleSetRoadTagsWriteSchema = z.object({
  userId: z.string().nullable(),
  ruleSetId: z.string(),
  tagKey: z.string(),
  value: z.string().nullable(),
});

type DbReadSchemas = {
  plans: typeof planReadSchema;
  routes: typeof routeReadSchema;
  route_breakdown_stats: typeof routeBreakdoiwnStatReadSchema;
  rule_sets: typeof ruleSetReadSchema;
  rule_set_road_tags: typeof ruleSetRoadTagsReadSchema;
  regions: typeof regionReadSchema;
};

type DbWriteSchemas = {
  plans: typeof planWriteSchema;
  rule_sets: typeof ruleSetWriteSchema;
  rule_set_road_tags: typeof ruleSetRoadTagsWriteSchema;
  routes: null;
  route_breakdown_stats: null;
  regions: null;
};

export type DataMappig<
  TDbTableName extends keyof DbReadSchemas & keyof DbWriteSchemas,
  TStoreTableName extends keyof typeof storeSchema,
  TDbTableReadSchema extends DbReadSchemas[TDbTableName],
  TDbTableWriteSchema extends DbWriteSchemas[TDbTableName],
  TStoreTableSchema extends (typeof storeSchema)[TStoreTableName],
> = {
  dbTableName: TDbTableName;
  dbReadSchema: TDbTableReadSchema;
  dbWriteSchema: TDbTableWriteSchema;
  storeTableName: TStoreTableName;
  storeSchema: TStoreTableSchema;
  mapperDbToStore: (
    r: z.infer<TDbTableReadSchema>,
  ) => z.infer<TStoreTableSchema>;
  mapperStoreToDb: TDbTableWriteSchema extends NonNullable<TDbTableWriteSchema>
    ? (
        r: z.infer<TStoreTableSchema>,
      ) => Omit<z.infer<TDbTableWriteSchema>, "userId">
    : null;
  idGetterFromDb: (r: z.infer<TDbTableReadSchema>) => string;
  writeToDb: TDbTableWriteSchema extends NonNullable<TDbTableWriteSchema>
    ? (
        db: ReturnType<typeof postgres>,
        r: z.infer<TDbTableWriteSchema>,
      ) => Promise<void>
    : null;
};

function createDataMapping<
  TDbTableName extends keyof DbReadSchemas,
  TStoreTableName extends keyof typeof storeSchema,
  TDbTableReadSchema extends DbReadSchemas[TDbTableName],
  TDbTableWriteSchema extends DbWriteSchemas[TDbTableName],
  TStoreTableSchema extends (typeof storeSchema)[TStoreTableName],
>(
  dbTableName: TDbTableName,
  storeTableName: TStoreTableName,
  dbReadSchema: TDbTableReadSchema,
  dbWriteSchema: TDbTableWriteSchema,
  storeSchema: TStoreTableSchema,
  mapperDbToStore: (
    r: z.infer<TDbTableReadSchema>,
  ) => z.infer<TStoreTableSchema>,
  mapperStoreToDb: TDbTableWriteSchema extends NonNullable<TDbTableWriteSchema>
    ? (
        r: z.infer<TStoreTableSchema>,
      ) => Omit<z.infer<TDbTableWriteSchema>, "userId">
    : null,
  idGetterFromDb: (r: z.infer<TDbTableReadSchema>) => string,
  writeToDb: TDbTableWriteSchema extends NonNullable<TDbTableWriteSchema>
    ? (
        db: ReturnType<typeof postgres>,
        r: z.infer<TDbTableWriteSchema>,
      ) => Promise<void>
    : null,
): DataMappig<
  TDbTableName,
  TStoreTableName,
  TDbTableReadSchema,
  TDbTableWriteSchema,
  TStoreTableSchema
> {
  return {
    dbTableName,
    storeTableName,
    dbReadSchema,
    dbWriteSchema,
    storeSchema,
    mapperDbToStore,
    mapperStoreToDb,
    idGetterFromDb,
    writeToDb,
  };
}

export const dataMappings = [
  createDataMapping(
    "plans",
    "plans",
    planReadSchema,
    planWriteSchema,
    storeSchema["plans"],
    (plan) => ({
      id: plan.id,
      name: plan.name,
      startLat: Number(plan.startLat),
      startLon: Number(plan.startLon),
      startDesc: plan.startDesc,
      finishLat: plan.finishLat !== null ? Number(plan.finishLat) : null,
      finishLon: plan.finishLon !== null ? Number(plan.finishLon) : null,
      finishDesc: plan.finishDesc,
      state: plan.state,
      bearing: plan.bearing !== null ? Number(plan.bearing) : null,
      distance: Number(plan.distance),
      createdAt: plan.createdAt.toISOString(),
      isDeleted: plan.isDeleted,
      tripType: plan.tripType,
      ruleSetId: plan.ruleSetId,
      mapPreviewDark: plan.mapPreviewDark,
      mapPreviewLight: plan.mapPreviewLight,
    }),
    (plan) => ({
      id: plan.id,
      name: plan.name,
      state: plan.state,
      startLat: plan.startLat.toString(),
      startLon: plan.startLon.toString(),
      startDesc: plan.startDesc,
      finishLat: plan.finishLat !== null ? plan.finishLat.toString() : null,
      finishLon: plan.finishLon !== null ? plan.finishLon.toString() : null,
      finishDesc: plan.finishDesc,
      bearing: plan.bearing !== null ? plan.bearing.toString() : null,
      distance: plan.distance.toString(),
      createdAt: new Date(plan.createdAt),
      isDeleted: plan.isDeleted || false,
      tripType: plan.tripType,
      ruleSetId: plan.ruleSetId,
      mapPreviewDark: plan.mapPreviewDark,
      mapPreviewLight: plan.mapPreviewLight,
      error: null,
      modifiedAt: new Date(),
      region: null,
    }),
    (plan) => plan.id,
    planUpsert,
  ),
  createDataMapping(
    "routes",
    "routes",
    routeReadSchema,
    null,
    storeSchema["routes"],
    (route) => ({
      id: route.id,
      planId: route.planId,
      createdAt: route.createdAt.toISOString(),
      isDeleted: route.isDeleted,
      downloadedAt: route.downloadedAt?.toISOString() || null,
      junctionCount: Number(route.statsJunctionCount),
      lenM: Number(route.statsLenM),
      name: route.name,
      score: Number(route.statsScore),
      mapPreviewDark: route.mapPreviewDark,
      mapPreviewLight: route.mapPreviewLight,
      coordsArrayString: route.linestring || "[]",
      coordsOverviewArrayString: route.linestring || "[]",
    }),
    null,
    (route) => route.id,
    null,
  ),
  createDataMapping(
    "route_breakdown_stats",
    "routeBreakdowns",
    routeBreakdoiwnStatReadSchema,
    null,
    storeSchema["routeBreakdowns"],
    (rb) => ({
      id: rb.id,
      routeId: rb.routeId,
      statType: rb.statType,
      statName: rb.statName,
      lenM: Number(rb.lenM),
      percentage: Number(rb.percentage),
    }),
    null,
    (rb) => rb.id,
    null,
  ),
  createDataMapping(
    "rule_sets",
    "ruleSets",
    ruleSetReadSchema,
    ruleSetWriteSchema,
    storeSchema["ruleSets"],
    (rs) => ({
      id: rs.id,
      icon: rs.icon,
      name: rs.name,
      isDefault: false,
      isDeleted: rs.isDeleted,
      isSystem: !rs.userId,
    }),
    (rs) => ({
      id: rs.id,
      icon: rs.icon,
      name: rs.name,
      isDeleted: rs.isDeleted || false,
      defaultSet: false,
    }),
    (rs) => rs.id,
    ruleSetUpsert,
  ),
  createDataMapping(
    "rule_set_road_tags",
    "ruleSetRoadTags",
    ruleSetRoadTagsReadSchema,
    ruleSetRoadTagsWriteSchema,
    storeSchema["ruleSetRoadTags"],
    (tag) => ({
      id: `${tag.ruleSetId}-${tag.tagKey}`,
      ruleSetId: tag.ruleSetId,
      tag: storeSchema.ruleSetRoadTags.shape.tag.parse(tag.tagKey),
      value: tag.value,
    }),
    (tag) => ({
      ruleSetId: tag.ruleSetId,
      tagKey: tag.tag,
      value: tag.value === null ? null : tag.value.toString(),
    }),
    (tag) => `${tag.ruleSetId}-${tag.tagKey}`,
    ruleSetRoadTagsUpsert,
  ),
  createDataMapping(
    "regions",
    "regions",
    regionReadSchema,
    null,
    storeSchema["regions"],
    (r) => ({
      region: r.region,
      geojsonString: JSON.stringify(r.geojson),
    }),
    null,
    (r) => r.region,
    null,
  ),
];
