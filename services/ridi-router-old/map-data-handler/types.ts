import { pg } from "@ridi-router/lib";

export type MapDataRecord = NonNullable<
  Awaited<ReturnType<typeof pg["mapDataGetRecordCurrent"]>>
>;
