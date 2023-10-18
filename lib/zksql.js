import NodeSQLParser from "node-sql-parser";
import { Table } from "./table.js";
import { is_valid_address } from "./aleo/index.js";
import { get_duplicates } from "./utils.js";

export const execute_query = async (query) => {
    const parser = new NodeSQLParser.Parser();
    let ast;
    try {
        ast = parser.astify(query);
        console.log("Executing query:");
        const sql = parser.sqlify(ast)
        console.log(sql);
        console.log();
    } catch (e) {
        console.log("/!\\ Error parsing query: ");
        console.log(e.message);
        return;
    }
    try {
        await execute_parsed_query(ast);
    } catch (e) {
        console.log("/!\\ Error executing query: ");
        console.log(e.message);
        return;
    }
};


const execute_parsed_query = async (query) => {
    if (query.type === "insert")
        await execute_insert_query(query);
    if (query.type === "select")
        await execute_select_query(query);
};


const database_from_attribute = (db_attribute) => {
    let database_name = global.context.account.address().to_string();
    if (db_attribute) {
        if (!is_valid_address(db_attribute))
            throw Error("Error: database should be a valid Aleo address.");
        database_name = db_attribute;
    }
    return database_name;
}


const table_from_parsed_table = async ({
    table,
    db,
    as
}) => {
    if (!table) {
        throw Error("Error: no table specified.");
    }
    const database = database_from_attribute(db);
    return await (
        new Table(
            database,
            table,
            as
        )
    ).load();
}


const execute_insert_query = async (query) => {
    const table = await table_from_parsed_table(query?.table?.[0]);
    await table.insert(query);
}


const execute_select_query = async (query) => {
    const froms = [];

    if (!query?.from?.length || query?.from?.length > 2) {
        throw Error(
            "Error: only one or two tables are supported for now."
        );
    }
    for (const parsed_from_table of query?.from) {
        const from = {
            ...parsed_from_table,
            table: await table_from_parsed_table(parsed_from_table),
        };
        froms.push(from);
    }
    const parsed_from_table = query?.from?.[0];
    if (parsed_from_table?.expr) {
        throw Error(
            "Error: nested queries are not supported for now."
        );
    }
    const columns = [];
    for (const column of query.columns) {
        if (column.expr.type === "aggr_func") {
            throw Error(
                "Error: aggregate functions are not supported for now."
            );
        }
        let table = null;
        for (const from of froms) {
            if (from.table.ref === column.expr.table) {
                table = from.table;
            }
        }
        if (!table) {
            throw Error(
                `Error: column ${column.expr.column} not found in any table.`
            );
        }
        const ref = column.as || column.expr.column;
        columns.push({
            ref,
            table,
            column: column.expr.column,
            out_ref: table.ref + "_" + ref
        });
    }
    const duplicates = get_duplicates(
        columns.map((row) => row.out_ref)
    );
    if (duplicates.length > 0) {
        throw Error(
            `Error: duplicate output columns: ${duplicates.join(", ")}.`
        );
    }
    // const code = program_code_from_select(from_table);
    // const program = await deploy_program(code);

    // console.log(query.from[1].on);
    /*
      {
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', table: null, column: 'id1' },
        right: { type: 'column_ref', table: null, column: 'id2' }
      }
    */

    /* SELECT * FROM abc.disperse_multi_method
        [
            { expr: { type: 'column_ref', table: null, column: '*' }, as: null }
        ]
    */

    /* SELECT a, b FROM abc.disperse_multi_method
        [
            { expr: { type: 'column_ref', table: null, column: 'a' }, as: null },
            { expr: { type: 'column_ref', table: null, column: 'b' }, as: null }
        ]
    */

    /*
        [
            { expr: { type: 'column_ref', table: null, column: 'a' }, as: 'x' },
            { expr: { type: 'column_ref', table: null, column: 'b' }, as: 'y' }
        ]
    */

    /*
        [
            {
                expr: { type: 'aggr_func', name: 'SUM', args: [Object], over: null },
                as: null
            }
        ]
    */
}
