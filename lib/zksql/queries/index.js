import NodeSQLParser from "node-sql-parser";

import { execute_insert_query } from "./insert.js";
import { execute_select_query } from "./select.js";
import { execute_create_table_query } from "./create.js";
export { retrieve_query_result } from "./result.js";


export const execute_query = async (query) => {
    const parser = new NodeSQLParser.Parser();
    let ast;
    try {
        ast = parser.astify(query);
        console.log("Executing query:");
        const sql = parser.sqlify(ast);
        console.log(sql);
        console.log();
    } catch (e) {
        console.log("/!\\ Error parsing query: ");
        //console.log(e?.message || e);
        console.log(e);
        return;
    }
    try {
        await execute_parsed_query(ast);
    } catch (e) {
        console.log("/!\\ Error executing query: ");
        //console.log(e?.message || e);
        console.log(e);
        return;
    }
};


const execute_parsed_query = async (query) => {
    if (query.type === "insert")
        return await execute_insert_query(query);
    if (query.type === "select")
        return await execute_select_query(query);
    if (query.type === "create") {
        if (query.keyword === "table")
            return await execute_create_table_query(query);
        if (query.keyword === "database")
            throw Error(
                "A database is an Aleo account. "
                + "Create one by using 'snarkos account new'"
            );
        throw Error(`Unsupported 'create' query: '${query.keyword}'.`);
    }
    throw Error(`Unsupported query: ${query.type}`);
};

