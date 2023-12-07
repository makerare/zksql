import { bech32m } from "bech32";
import crypto from 'crypto'

import { hexToBytes } from "../../utils/index.js";
import {
    get_tables_from_parsed_tables,
    get_fields_from_parsed_columns,
    get_all_fields,
} from "../sql/table.js";
import { network_get_records } from "../../aleo/network.js";
import { Table } from "../sql/table.js";


export const execute_select_query = async (query) => {
    const froms = await get_tables_from_parsed_tables(query?.from);
    const all_fields = get_all_fields(froms);
    const fields = get_fields_from_parsed_columns(query.columns, all_fields);
    const where = parse_where_expression(query.where, froms, fields, all_fields);
    const aggregates = [];//get_aggregates_from_parsed_columns(fields);
    console.log({ where: where.right.value[2] });

    const user_address = global.context.account.address().to_string();
    const all_owned = fields.every(
        ({ table }) => (table.database === user_address)
    );
    if (all_owned)
        return await execute_select_query_owned(query, froms, fields, where);

    //const program = select_query_to_program(query, froms, fields);
    const table = select_query_to_table(froms, fields, where, aggregates);

    // const program = await deploy_program(code);
    // console.log(query.from[1].on);
}



export const execute_select_query_owned = async (
    query, froms, fields, where
) => {
    return;
}


export const select_query_to_table = (froms, fields, where, aggregates) => {
    const table_name = random_variable_name("slc");
    const columns = fields.map(({ column, ref }) => ({
        ...column,
        attribute: ref,
    }));
    const table = Table.from_columns(
        global.context.account.address().to_string(),
        table_name,
        columns,
        true,
    );

    table.program.imports.push(...select_imports(table, froms));
    table.program.structs.push(...select_structs(table, froms, aggregates));
    table.program.records.push(...select_records(table, froms, aggregates));
    table.program.functions.push(
        ...select_functions(table, froms, fields, where)
    );

    console.log(table.program.code)
    return table;
}


const done_record_name = (table_name) => {
    return `Done_${table_name}`;
}

const aggregates_struct_name = (table_name) => {
    return `Aggr_${table_name}`;
}



const select_done_record = (table) => {
    return {
        name: done_record_name(table.name),
        fields: [
            {
                name: "owner",
                type: {
                    category: "address",
                    value: "address",
                    visibility: "private",
                },
            },
        ],
    };
}


const select_request_record = (table, froms, aggregates) => {
    return {
        name: done_record_name(table.name),
        fields: ([
            {
                name: "owner",
                type: {
                    category: "address",
                    value: "address",
                    visibility: "private",
                },
            },
            {
                name: "id",
                type: {
                    category: "integer",
                    value: "field",
                    visibility: "private",
                },
            },
        ]).concat(
            aggregates.length ? [
                {
                    name: "aggregates",
                    type: {
                        category: "custom",
                        value: aggregates_struct_name(table.name),
                        visibility: "private",
                    },
                },
            ] : []),
    };
}


const select_records = (table, froms, aggregates) => {
    return [
        select_done_record(table),
        select_request_record(table, froms, aggregates),
    ];
}


const select_structs = (table, froms, aggregates) => {
    return froms
        .map((from) => from.description_struct)
        .concat([{
            name: aggregates_struct_name(table.name),
            fields: aggregates.map(({ name, type }) => ({
                name,
                type,
            })),
        }]);
}


const select_functions = (table, froms, fields, where) => {
    return [
        ...select_process_functions(table, froms, fields, where),
        select_done_function(table, froms)
    ];
}


const select_imports = (table, froms) => {
    return froms.map(({ program }) => program);
}


const select_process_functions = (table, froms, fields, where) => {
    const process_function = (froms.length === 1) ?
        single_from_select_process_function :
        multiple_from_select_process_function;
    // TODO: implement multiple froms
    return froms.map(
        (from, index) => process_function(table, from, fields, index, where)
    )
}


const single_from_select_process_function = (
    to, from, fields, index, where
) => {
    const select_filter_cast_inputs = fields.map(
        ({ column, ref }) => ({
            name: `r0.${column.attribute}`,
        })
    );
    return {
        name: `proc_${to.name}`,
        inputs: [
            {
                name: "r0",
                type: {
                    category: "custom",
                    value: from.row_record.name,
                    visibility: "record",
                    from_program: from.name
                },
            },
        ],
        body: [
            {
                opcode: "assert_eq",
                inputs: [
                    {
                        name: "self.caller",
                    },
                    {
                        name: from.database,
                    }
                ],
                outputs: [],
            },
            {
                opcode: "cast",
                inputs: select_filter_cast_inputs,
                outputs: [{
                    name: "r1",
                    type: {
                        category: "custom",
                        value: to.description_struct.name,
                    },
                }],
            },
            {
                opcode: "cast",
                inputs: [
                    {
                        name: to.database,
                    },
                    {
                        name: "r1.data",
                    },
                ],
                outputs: [{
                    name: "r2",
                    type: {
                        category: "custom",
                        value: to.row_record.name,
                        visibility: "record",
                    },
                }],
            }
        ],
        outputs: [{
            name: "r2",
            type: {
                category: "custom",
                value: to.row_record.name,
                visibility: "record",
            },
        },],
    };
}


const select_done_function = (to, froms) => {
    return (froms.length === 1) ?
        single_from_select_done_function(to, froms[0]) :
        multiple_from_select_done_function(to, froms);
    // TODO: implement multiple froms
}


const single_from_select_done_function = (to, from) => {
    return {
        name: `end_${to.name}`,
        inputs: [],
        body: [
            {
                opcode: "assert_eq",
                inputs: [
                    {
                        name: "self.caller",
                    },
                    {
                        name: from.database,
                    }
                ],
                outputs: [],
            },
            {
                opcode: "cast",
                inputs: [
                    {
                        name: to.database,
                    },
                ],
                outputs: [{
                    name: "r0",
                    type: {
                        category: "custom",
                        value: select_done_record(to).name,
                        visibility: "record",
                    },
                }],
            }
        ],
        outputs: [{
            name: "r0",
            type: {
                category: "custom",
                value: select_done_record(to).name,
                visibility: "record",
            },
        },],
    };
}


const random_variable_name = () => {
    const uuid = crypto.randomUUID().replaceAll('-', '');
    const to_encode = BigInt(`0x${uuid}`);
    const first_char_index = Number(to_encode % 26n);
    const first_char = String.fromCharCode(97 + first_char_index);
    const next_to_encode = to_encode / 26n;
    const rest_chars = next_to_encode
        .toString(36)
        .toLowerCase()
        .padStart(24, '0');
    return `${first_char}${rest_chars}`;
}


const parse_where_expression = (expression, froms, fields, all_fields) => {
    // types :      'select','column_ref','binary_expr','single_quote_string','expr_list','null','number','bool'
    // operators:   'AND', '=', 'IN', 'OR', 'IS NOT', '<>'
    if (expression?.type === "select") {
        throw new Error(
            `Select queries are not supported in where clauses yet.`
        );
    }
    if (expression?.type === "binary_expr") {
        expression.left = parse_where_expression(
            expression.left, froms, fields, all_fields
        );
        expression.right = parse_where_expression(
            expression.right, froms, fields, all_fields
        );
        return parse_binary_expr_expression(expression);
    }
    if (expression?.type === "column_ref") {
        return parse_column_ref_expression(
            expression, froms, fields, all_fields
        );
    }
    if (expression?.type === "expr_list") {
        for (const [index, element] of expression.value.entries()) {
            expression[index] = parse_where_expression(
                element, froms, fields, all_fields
            );
        }
    }
    return expression
}


const where_to_instructions = (where) => {
    if (where?.type === "bool")
        return where.value;
    if (where?.type === "number")
        return Boolean(where.value);
    if (where?.type === "binary_expr")
        return where_binary_expr_to_instructions(where);
    if (where?.type === "column_ref")
        return where_binary_expr_to_instructions(where);
    throw new Error(
        `Where clause type ${where.type} not supported.`
    );
}


const parse_column_ref_expression = (expression, froms, fields, all_fields) => {
    let corresponding_fields = expression?.table ? fields.filter(
        ({ table }) => table.ref === expression.table
    ) : all_fields;
    corresponding_fields = corresponding_fields.filter(
        ({ ref }) => ref === expression.column
    );
    if (corresponding_fields.length === 0)
        throw new Error(
            `Column ${expression.column} not found.`
        );
    if (corresponding_fields.length > 1)
        throw new Error(
            `Column ${expression.column} is ambiguous.`
        );
    expression.field = corresponding_fields[0];
    return expression;
}


const parse_binary_expr_expression = (expression) => {
    const { left, right, operator } = expression;

    return expression;
}