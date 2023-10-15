import NodeSQLParser from "node-sql-parser";
import { Table } from "./table.js";


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
};


const execute_insert_query = async (query) => {
    const { table: tablename, database: dbname } = query?.table?.[0];
    if (!tablename) {
        console.log("Error: no table specified");
        return;
    }
    if (dbname) {
        console.log("Database not supported yet");
        /*
            const db = new await (
            new Db(tablename)
            ).load();
        */
    }
    const table = await (
        new Table(
            tablename,
            // db
        )
    ).load();

    await table.insert(query);
}
