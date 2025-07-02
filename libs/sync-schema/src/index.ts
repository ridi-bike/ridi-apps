import { type Store, type Ids } from "tinybase";
import { type z } from "zod";

export type StoreSchema = Record<string, z.SomeZodObject>;

export type TypedTable<
  TSchema extends StoreSchema,
  TTableId extends keyof TSchema,
> = Record<string, z.infer<TSchema[TTableId]>>;

export type TableCellIds<
  TSchema extends StoreSchema,
  TTableId extends keyof TSchema,
> = keyof TypedTable<TSchema, TTableId>[string];

export type StoreWithSchema<TSchema extends StoreSchema> = {
  getValues: Store["getValues"];
  getValuesIds: Store["getValueIds"];
  getTableIds: Store["getTableIds"];
  getTables: () => {
    [tableId in keyof TSchema]: tableId extends string
      ? TypedTable<TSchema, tableId>
      : never;
  };
  getTable: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
  ) => TypedTable<TSchema, TTableId>;
  getTableCellIds: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
  ) => TableCellIds<TSchema, TTableId>[];
  getRowIds: <TTableId extends keyof StoreSchema>(
    tableId: Extract<TTableId, string>,
  ) => string[];
  getSortedRowIds: <
    TTableId extends keyof TSchema,
    TCellId extends keyof TypedTable<TSchema, TTableId>[string],
  >(
    tableId: Extract<TTableId, string>,
    cellId?: Extract<TCellId, string>,
    descending?: boolean,
    ofset?: number,
    limit?: number,
  ) => Ids;
  getRow: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    rowId: string,
  ) => z.infer<TSchema[TTableId]>;
  getCellIds: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    rowId: string,
  ) => TableCellIds<TSchema, TTableId>[];
  getCell: <
    TTableId extends keyof TSchema,
    TCellId extends TableCellIds<TSchema, TTableId>,
  >(
    tableId: Extract<TTableId, string>,
    rowId: string,
    cellId: Extract<TCellId, string>,
  ) => z.infer<TSchema[TTableId]>[TCellId];
};

function assertTableSchema(
  tableId: string,
  tableSchema: z.SomeZodObject | undefined,
): asserts tableSchema is z.SomeZodObject {
  if (!tableSchema) {
    throw new Error(`Missing schema for table ${tableId}`);
  }
}

export function withSchema<TSchema extends StoreSchema>(
  store: Store,
  schema: TSchema,
): StoreWithSchema<TSchema> {
  function validateCellIds(tableId: string, cellIds: string[]) {
    const tableSchema = schema[tableId];
    assertTableSchema(tableId, tableSchema);
    const cellIdSchemas = {
      ...tableSchema.shape,
    };
    for (const cellId in cellIds) {
      const cellIdSchema = cellIdSchemas[cellId];
      if (!cellIdSchema) {
        throw new Error(`CellId ${cellId} not found in schema`);
      }
      delete cellIdSchemas[cellId];
    }
    Object.entries(cellIdSchemas).forEach(([cellId, cellSchema]) => {
      if (!cellSchema.isNullable() || !cellSchema.isOptional()) {
        throw new Error(
          `CellId ${cellId} is not marked as nullable or optional but missing in cellIds`,
        );
      }
    });
    return cellIds;
  }
  return {
    getValues: (...args) => store.getValues(...args),
    getValuesIds: (...args) => store.getValueIds(...args),
    getTableIds: (...args) => store.getTableIds(...args),
    getTables: () => {
      const tables = store.getTables();

      for (const [tableId, table] of Object.entries(tables)) {
        assertTableSchema(tableId, schema[tableId]);
        for (const [rowId, row] of Object.entries(table)) {
          const parsed = schema[tableId].safeParse(row);
          if (!parsed.success) {
            throw new Error(
              `Failed to validate data for table ${tableId}:${rowId}: ${parsed.error}`,
            );
          }
        }
      }

      return tables as ReturnType<StoreWithSchema<TSchema>["getTables"]>;
    },

    getTable: (tableId) => {
      const table = store.getTable(tableId);

      assertTableSchema(tableId, schema[tableId]);
      for (const [rowId, row] of Object.entries(table)) {
        const parsed = schema[tableId].safeParse(row);
        if (!parsed.success) {
          throw new Error(
            `Failed to validate data for table ${tableId.toString()}:${rowId}: ${parsed.error}`,
          );
        }
      }

      return table as TypedTable<TSchema, typeof tableId>;
    },

    getTableCellIds: (tableId) => {
      const cellIds = store.getTableCellIds(tableId);
      validateCellIds(tableId, cellIds);
      return cellIds;
    },

    getRowIds: (tableId) => {
      return store.getRowIds(tableId);
    },

    getSortedRowIds: (tableId, cellId, descending, offset, limit) => {
      return store.getSortedRowIds(tableId, cellId, descending, offset, limit);
    },

    getRow: (tableId, rowId) => {
      const row = store.getRow(tableId, rowId);
      assertTableSchema(tableId, schema[tableId]);
      return schema[tableId].parse(row);
    },

    getCellIds: (tableId, rowId) => {
      const cellIds = store.getCellIds(tableId, rowId);
      validateCellIds(tableId, cellIds);
      return cellIds;
    },

    getCell: (tableId, rowId, cellId) => {
      const cell = store.getCell(tableId, rowId, cellId);
      assertTableSchema(tableId, schema[tableId]);
      const cellSchema = schema[tableId].shape[cellId];
      if (!cellSchema) {
        throw new Error(
          `Missing cell schema in table ${tableId} for cellid ${cellId}`,
        );
      }
      return cellSchema.parse(cell);
    },
  };
}
