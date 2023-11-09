import { bech32m } from "bech32";
import crypto from 'crypto'

import { hexToBytes } from "../../utils/index.js";
import {
    get_tables_from_parsed_tables,
    get_fields_from_parsed_columns
} from "../sql/table.js";
import { network_get_records } from "../../aleo/network.js";
import { Table } from "../sql/table.js";


export const execute_select_query = async (query) => {
    const froms = await get_tables_from_parsed_tables(query?.from);
    const fields = get_fields_from_parsed_columns(query.columns, froms);

    // IF all columns in tables owned by caller :
    const user_address = global.context.account.address().to_string();
    const all_owned = fields.every(
        column => (column.table.database === user_address)
    );
    if (all_owned)
        return await execute_select_query_owned(query, froms, fields);

    //const program = select_query_to_program(query, froms, fields);
    const table = select_query_to_table(query, froms, fields);

    // const program = await deploy_program(code);
    // console.log(query.from[1].on);
}


export const execute_select_query_owned = async (query, froms, fields) => {
    return;
    // const records = await network_get_records(table.program.id);
}


export const select_query_to_table = (query, froms, fields) => {
    const table_name = random_variable_name();
    const table = new Table(
        global.context.account.address().to_string(),
        table_name,
        undefined,
        true
    ).load_from_select_query(query, froms, fields);

    return table;
}


export const select_query_to_program_code = (program_id, query, froms, columns) => {
    const imports = froms.map(
        from => (`import ${from.table.program.id};`)
    ).join("\n");

    return (
        `${imports}\n`
        + `program ${program_id};\n\n`

        + `struct ${table.description_struct_name}:\n`
        + `${attributes_definition}\n\n`

        + `function fullfill_request_${table.name}:\n`
    );
}


const random_variable_name = () => {
    const uuid = crypto.randomUUID().replaceAll('-', '');
    const words = bech32m.toWords(hexToBytes(uuid));
    return bech32m.encode("t", words);
}



`
program select_request.aleo;

struct RowData_select_request:
    a as field;

record Row_select_request:
    owner as address.private;
    data as RowData_select_request.private;

record Done_select_request:
    owner as address.private;


function fullfill_request_select_request:
    input r0 as table1.aleo/Row_table1.record;
    assert.eq self.signer aleo1kht9fxxd5htnxh47e3e62zh7dd8g994m70cuycvwlr7ma5fyrsps3zjccr;
    gt r0.data.column1 3field into r1;
    assert.eq r1 true;
    cast r0.data.column1 into r2 as RowData_select_request;
    cast aleo1wckhs4t8hxg63zddpkv3eqmas5j43m9782gfa20rdl8kr8s0hgqqpxd7le r2 into r3 as Row_select_request.record;
    output r3 as Row_select_request.record;


function conclude_request_select_request:
    assert.eq self.caller aleo1kht9fxxd5htnxh47e3e62zh7dd8g994m70cuycvwlr7ma5fyrsps3zjccr;
    cast aleo1wckhs4t8hxg63zddpkv3eqmas5j43m9782gfa20rdl8kr8s0hgqqpxd7le into r0 as Done_select_request.record;
    output r0 as Done_select_request.record;    
`