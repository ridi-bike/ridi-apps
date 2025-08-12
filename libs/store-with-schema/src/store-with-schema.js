import { z } from "zod";
export function createStoreSchemaValidators(schema) {
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
                        throw new Error(`Failed to validate data for table ${tableId}:${rowId}: ${parsed.error}`);
                    }
                }
            }
        },
        validateTable(tableId, table) {
            assertTableSchema(tableId, schema[tableId]);
            for (const [rowId, row] of Object.entries(table)) {
                const parsed = schema[tableId].safeParse(row);
                if (!parsed.success) {
                    throw new Error(`Failed to validate data for table ${tableId.toString()}:${rowId}: ${parsed.error}`);
                }
            }
        },
        validateRow(tableId, row) {
            assertTableSchema(tableId, schema[tableId]);
            schema[tableId].parse(row);
        },
        validatePartialRow(tableId, partialRow) {
            assertTableSchema(tableId, schema[tableId]);
            const partialSchema = z.object(Object.keys(partialRow).reduce((res, cellId) => {
                const cellSchema = schema[tableId]?.shape[cellId];
                if (!cellSchema) {
                    throw new Error(`Unexpected cellId found ${cellId}`);
                }
                res[cellId] = cellSchema;
                return res;
            }, {}));
            partialSchema.parse(partialRow);
        },
        validateCell(tableId, cellId, cell) {
            assertTableSchema(tableId, schema[tableId]);
            const cellSchema = schema[tableId].shape[cellId];
            if (!cellSchema) {
                throw new Error(`Missing cell schema in table ${tableId} for cellid ${cellId}`);
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
                    throw new Error(`CellId ${cellId} is not marked as nullable or optional but missing in cellIds`);
                }
            });
        },
    };
}
function assertTableSchema(tableId, tableSchema) {
    if (!tableSchema) {
        throw new Error(`Missing schema for table ${tableId}`);
    }
}
export function withSchema(store, schema) {
    const validator = createStoreSchemaValidators(schema);
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
            assertTableSchema(tableId, schema[tableId]);
            const row = store.getRow(tableId, rowId);
            return schema[tableId].parse(row);
        },
        setRow: (tableId, rowId, row) => {
            validator.validateRow(tableId, row);
            store.setRow(tableId, rowId, row);
        },
        delRow: (tableId, rowId) => {
            assertTableSchema(tableId, schema[tableId]);
            store.delRow(tableId, rowId);
        },
        setPartialRow: (tableId, rowId, partialRow) => {
            validator.validatePartialRow(tableId, partialRow);
            store.setRow(tableId, rowId, partialRow);
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
                    const newCell = cell(prevCell);
                    validator.validateCell(tableId, cellId, newCell);
                    return newCell;
                });
            }
            else {
                validator.validateCell(tableId, cellId, cell);
                store.setCell(tableId, rowId, cellId, cell);
            }
        },
    };
}
