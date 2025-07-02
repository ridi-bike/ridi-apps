import {
  useTables as useTablesOrig,
  useTableIds as useTableIdsOrig,
  useTable as useTableOrig,
  useTableCellIds as useTableCellIdsOrig,
  useRowIds as useRowIdsOrig,
  useSortedRowIds as useSortedRowIdsOrig,
  useRow as useRowOrig,
  useCellIds as useCellIdsOrig,
  useCell as useCellOrig,
} from "tinybase/ui-react";
import { type z } from "zod";

import {
  type StoreSchema,
  type StoreSchemaValidator,
  type StoreWithSchema,
  type TableCellId,
  type TypedTable,
  type TypedTables,
} from "./store-with-schema";

export function useTables<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
>(store: TStore): TypedTables<TSchema> {
  const tables = useTablesOrig(store.getInternalStore());
  const validator: StoreSchemaValidator<TSchema> = store.getInternalValidator();
  validator.validateTables(tables);
  return tables;
}

export function useTable<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
  TTableId extends keyof TSchema,
>(
  store: TStore,
  tableId: Extract<TTableId, string>,
): TypedTable<TSchema, TTableId> {
  const table = useTableOrig(tableId, store.getInternalStore());
  const validator: StoreSchemaValidator<TSchema> = store.getInternalValidator();
  validator.validateTable(tableId, table);
  return table;
}

export function useTableIds<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
>(store: TStore): keyof TSchema {
  const tableIds = useTableIdsOrig(store.getInternalStore());
  const validator: StoreSchemaValidator<TSchema> = store.getInternalValidator();
  validator.validateTableIds(tableIds);
  return tableIds;
}

export function useTableCellIds<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
  TTableId extends keyof TSchema,
>(
  store: TStore,
  tableId: Extract<TTableId, string>,
): TableCellId<TSchema, TTableId>[] {
  const cellIds = useTableCellIdsOrig(tableId, store.getInternalStore());
  const validator: StoreSchemaValidator<TSchema> = store.getInternalValidator();
  validator.validateCellIds(tableId, cellIds);
  return cellIds;
}

export function useRowIds<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
  TTableId extends keyof TSchema,
>(store: TStore, tableId: Extract<TTableId, string>): string[] {
  const rowIds = useRowIdsOrig(tableId, store.getInternalStore());
  return rowIds;
}

export function useSortedRowIds<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
  TTableId extends keyof TSchema,
  TCellId extends keyof TypedTable<TSchema, TTableId>[string],
>(
  store: TStore,
  tableId: Extract<TTableId, string>,
  cellId?: Extract<TCellId, string>,
  descending?: boolean,
  ofset?: number,
  limit?: number,
): string[] {
  const rowIds = useSortedRowIdsOrig(
    tableId,
    cellId,
    descending,
    ofset,
    limit,
    store.getInternalStore(),
  );
  return rowIds;
}

export function useRow<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
  TTableId extends keyof TSchema,
>(
  store: TStore,
  tableId: Extract<TTableId, string>,
  rowId: string,
): z.infer<TSchema[TTableId]> {
  const row = useRowOrig(tableId, rowId, store.getInternalStore());
  const validator: StoreSchemaValidator<TSchema> = store.getInternalValidator();
  validator.validateRow(tableId, row);
  return row;
}

export function useCellIds<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
  TTableId extends keyof TSchema,
>(
  store: TStore,
  tableId: Extract<TTableId, string>,
  rowId: string,
): TableCellId<TSchema, TTableId>[] {
  const cellIds = useCellIdsOrig(tableId, rowId, store.getInternalStore());
  const validator: StoreSchemaValidator<TSchema> = store.getInternalValidator();
  validator.validateCellIds(tableId, cellIds);
  return cellIds;
}

export function useCell<
  TSchema extends StoreSchema,
  TStore extends StoreWithSchema<TSchema>,
  TTableId extends keyof TSchema,
  TCellId extends TableCellId<TSchema, TTableId>,
>(
  store: TStore,
  tableId: Extract<TTableId, string>,
  rowId: string,
  cellId: Extract<TCellId, string>,
): z.infer<TSchema[TTableId]> {
  const cell = useCellOrig(tableId, rowId, cellId, store.getInternalStore());
  const validator: StoreSchemaValidator<TSchema> = store.getInternalValidator();
  validator.validateCell(tableId, cellId, cell);
  return cell;
}
