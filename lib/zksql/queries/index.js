import NodeSQLParser from "node-sql-parser";
import { Table } from "../sql/table.js";
import { is_valid_address } from "../../aleo/index.js";

import { execute_insert_query } from "./insert.js";
import { execute_select_query } from "./select.js";


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

