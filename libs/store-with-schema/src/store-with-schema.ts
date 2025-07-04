import { type Store, type Ids, type Row } from "tinybase";
import { z } from "zod";

export type StoreSchema = Record<string, z.SomeZodObject>;

export type TypedTable<
  TSchema extends StoreSchema,
  TTableId extends keyof TSchema,
> = Record<string, z.infer<TSchema[TTableId]>>;

export type TableCellId<
  TSchema extends StoreSchema,
  TTableId extends keyof TSchema,
> = keyof TypedTable<TSchema, TTableId>[string];

export type TypedTables<TSchema extends StoreSchema> = {
  [tableId in keyof TSchema]: TypedTable<TSchema, tableId>;
};

export type StoreSchemaValidator<TSchema extends StoreSchema> = {
  validateTables: (
    tables: Record<string, Record<string, Record<string, unknown>>>,
  ) => asserts tables is TypedTables<TSchema>;
  validateTable: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    table: Record<string, Record<string, unknown>>,
  ) => asserts table is TypedTable<TSchema, TTableId>;
  validateRow: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    row: unknown,
  ) => asserts row is z.infer<TSchema[TTableId]>;
  validatePartialRow: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    partialRow: Record<string, unknown>,
  ) => asserts partialRow is Partial<z.infer<TSchema[TTableId]>>;
  validateCell: <
    TTableId extends keyof TSchema,
    TCellId extends TableCellId<TSchema, TTableId>,
  >(
    tableId: Extract<TTableId, string>,
    cellId: Extract<TCellId, string>,
    cell: unknown,
  ) => asserts cell is z.infer<TSchema[TTableId]>[TCellId];
  validateCellIds: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    cellIds: unknown[],
  ) => asserts cellIds is TableCellId<TSchema, TTableId>[];
  validateTableIds: (
    tableIds: unknown,
  ) => asserts tableIds is keyof TypedTables<TSchema>;
};

export function createStoreSchemaValidators<TSchema extends StoreSchema>(
  schema: TSchema,
): StoreSchemaValidator<TSchema> {
  return {
    validateTableIds(tableIds) {
      if (!Array.isArray(tableIds)) {
        throw new Error("Table ids not an array");
      }
      if (tableIds.some((tableId) => !schema[tableId])) {
        throw new Error(`Unexpected tableId`);
      }
    },
    validateTables(tables) {
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
    },
    validateTable(tableId, table) {
      assertTableSchema(tableId, schema[tableId]);
      for (const [rowId, row] of Object.entries(table)) {
        const parsed = schema[tableId].safeParse(row);
        if (!parsed.success) {
          throw new Error(
            `Failed to validate data for table ${tableId.toString()}:${rowId}: ${parsed.error}`,
          );
        }
      }
    },
    validateRow(tableId, row) {
      assertTableSchema(tableId, schema[tableId]);
      schema[tableId].parse(row);
    },
    validatePartialRow(tableId, partialRow) {
      assertTableSchema(tableId, schema[tableId]);
      const partialSchema = z.object(
        Object.keys(partialRow).reduce(
          (res, cellId) => {
            const cellSchema = schema[tableId]?.shape[cellId];
            if (!cellSchema) {
              throw new Error(`Unexpected cellId found ${cellId}`);
            }
            res[cellId] = cellSchema;
            return res;
          },
          {} as Record<string, z.ZodSchema>,
        ),
      );
      partialSchema.parse(partialRow);
    },
    validateCell(tableId, cellId, cell) {
      assertTableSchema(tableId, schema[tableId]);
      const cellSchema = schema[tableId].shape[cellId];
      if (!cellSchema) {
        throw new Error(
          `Missing cell schema in table ${tableId} for cellid ${cellId}`,
        );
      }
      cellSchema.parse(cell);
    },
    validateCellIds(tableId, cellIds) {
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
    },
  };
}

export type StoreWithSchema<TSchema extends StoreSchema> = {
  getInternalValidator: () => StoreSchemaValidator<TSchema>;
  getInternalStore: () => Store;
  getValues: Store["getValues"];
  getValuesIds: Store["getValueIds"];
  getTableIds: Store["getTableIds"];
  getTables: () => TypedTables<TSchema>;
  setTables: (tables: {
    [tableId in keyof TSchema]: tableId extends string
      ? TypedTable<TSchema, tableId>
      : never;
  }) => void;
  getTable: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
  ) => TypedTable<TSchema, TTableId>;
  setTable: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    table: TypedTable<TSchema, TTableId>,
  ) => void;
  getTableCellIds: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
  ) => TableCellId<TSchema, TTableId>[];
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
  setRow: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    rowId: string,
    row: z.infer<TSchema[TTableId]>,
  ) => void;
  setPartialRow: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    rowId: string,
    row: Partial<z.infer<TSchema[TTableId]>>,
  ) => void;
  getCellIds: <TTableId extends keyof TSchema>(
    tableId: Extract<TTableId, string>,
    rowId: string,
  ) => TableCellId<TSchema, TTableId>[];
  getCell: <
    TTableId extends keyof TSchema,
    TCellId extends TableCellId<TSchema, TTableId>,
  >(
    tableId: Extract<TTableId, string>,
    rowId: string,
    cellId: Extract<TCellId, string>,
  ) => z.infer<TSchema[TTableId]>[TCellId];
  setCell: <
    TTableId extends keyof TSchema,
    TCellId extends TableCellId<TSchema, TTableId>,
  >(
    tableId: Extract<TTableId, string>,
    rowId: string,
    cellId: Extract<TCellId, string>,
    cell:
      | z.infer<TSchema[TTableId]>[TCellId]
      | ((
          v: z.infer<TSchema[TTableId]>[TCellId],
        ) => z.infer<TSchema[TTableId]>[TCellId]),
  ) => void;
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
  const validator: StoreSchemaValidator<TSchema> =
    createStoreSchemaValidators(schema);

  return {
    getInternalValidator: () => validator,
    getInternalStore: () => store,
    getValues: (...args) => store.getValues(...args),
    getValuesIds: (...args) => store.getValueIds(...args),
    getTableIds: () => {
      const tableIds = store.getTableIds();
      validator.validateTableIds(tableIds);
      return tableIds;
    },
    getTables: () => {
      const tables = store.getTables();
      validator.validateTables(tables);
      return tables;
    },
    setTables: (tables) => {
      validator.validateTables(tables);
      store.setTables(tables);
    },

    getTable: (tableId) => {
      const table = store.getTable(tableId);
      validator.validateTable(tableId, table);
      return table;
    },

    setTable: (tableId, table) => {
      validator.validateTable(tableId, table);
      store.setTable(tableId, table);
    },

    getTableCellIds: (tableId) => {
      const cellIds = store.getTableCellIds(tableId);
      validator.validateCellIds(tableId, cellIds);
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
    setRow: (tableId, rowId, row) => {
      validator.validateRow(tableId, row);
      store.setRow(tableId, rowId, row);
    },
    setPartialRow: (tableId, rowId, partialRow) => {
      validator.validatePartialRow(tableId, partialRow);
      store.setRow(tableId, rowId, partialRow as Row);
    },

    getCellIds: (tableId, rowId) => {
      const cellIds = store.getCellIds(tableId, rowId);
      validator.validateCellIds(tableId, cellIds);
      return cellIds;
    },

    getCell: (tableId, rowId, cellId) => {
      const cell = store.getCell(tableId, rowId, cellId);
      validator.validateCell(tableId, cellId, cell);
      return cell;
    },
    setCell: (tableId, rowId, cellId, cell) => {
      const rowIds = store.getRowIds(tableId);
      if (!rowIds.includes(rowId)) {
        return;
      }
      if (typeof cell === "function") {
        store.setCell(tableId, rowId, cellId, (prevCell) => {
          validator.validateCell(tableId, cellId, prevCell);
          const newCell = (cell as (v: unknown) => unknown)(prevCell);
          validator.validateCell(tableId, cellId, newCell);
          return newCell;
        });
      } else {
        validator.validateCell(tableId, cellId, cell);
        store.setCell(tableId, rowId, cellId, cell);
      }
    },
  };
}
