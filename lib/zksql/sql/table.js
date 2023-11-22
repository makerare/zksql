import { zip, diff, get_duplicates, inter } from "../../utils/index.js";
import { Program, is_valid_address, integer_types } from "../../aleo/index.js";


export class Table {
  constructor(database_name, table_name, program, as = null) {
    this.program = program;
    this.database = database_name;
    this.name = table_name;
    this.ref = as || table_name;
  }

  get description_struct_name() {
    return table_name_to_description_struct_name(this.name);
  }

  get row_record_name() {
    return table_name_to_row_record_name(this.name);
  }

  get insert_transition_name() {
    return table_name_to_insert_transition_name(this.name);
  }

  get update_transition_name() {
    return table_name_to_update_transition_name(this.name);
  }

  get delete_transition_name() {
    return table_name_to_delete_transition_name(this.name);
  }

  get is_view() {
    return is_program_view(this.program);
  }

  get columns() {
    for (const struct of this.program.structs) {
      if (struct.name === this.description_struct_name) {
        return struct.fields.map(
          ({ name, type }) => ({
            attribute: name,
            aleo_type: type,
            sql_type: null,
            ast_type: null,
          })
        );
      }
    }
    throw new Error(
      `Struct '${this.description_struct_name}' `
      + `was not found in program source code.`
    );
  }

  async deploy() {
    return await this.program.deploy();
  }

  async insert(query) {
    if (this.is_view)
      throw Error("Cannot insert into a view.");

    const row = query_to_insert_row(this.columns, query);
    const args = [row_to_record_string(row)];
    await this.program.call(this.insert_transition_name, args);;
  }
}


Table.from_parsed_table = async function ({
  db,
  table,
  as
}) {
  const database = database_from_attribute(db);
  const program = await Program.from_deployed(table);

  return new Table(
    database,
    table,
    program,
    as = as
  );
};


Table.from_columns = function (
  database_name, table_name, columns, is_view = false
) {
  const program = table_program_from_columns(table_name, columns, is_view);
  return new Table(
    database_name,
    table_name,
    program,
  );
};


const table_name_to_description_struct_name = (table_name) => (
  `RowData_${table_name}`
);


const table_name_to_row_record_name = (table_name) => (
  `Row_${table_name}`
);


const table_name_to_insert_transition_name = (table_name) => (
  `insert_${table_name}`
);


const table_name_to_update_transition_name = (table_name) => (
  `update_${table_name}`
);


const table_name_to_delete_transition_name = (table_name) => (
  `delete_${table_name}`
);


const is_program_view = (program) => {
  return inter(
    new Set(
      program.structs.map(({ name }) => name)
    ),
    new Set([
      table_name_to_insert_transition_name(program.name),
      table_name_to_update_transition_name(program.name),
      table_name_to_delete_transition_name(program.name),
    ])
  ).size === 3;
}


const table_program_from_columns = (table_name, columns, is_view) => {
  return new Program(
    table_name,
    {
      imports: [],
      structs: table_program_structs(table_name, columns),
      records: table_program_records(table_name),
      mappings: [],
      closures: [],
      functions: table_program_functions(table_name, is_view),
    }
  );
}

const table_program_structs = (table_name, columns) => {
  const struct_attributes = columns.map(column_to_attribute);
  const struct = {
    name: table_name_to_description_struct_name(table_name),
    fields: struct_attributes,
  };
  return [struct];
}


const table_program_records = (table_name) => {
  return [{
    name: table_name_to_row_record_name(table_name),
    fields: [
      {
        name: "owner",
        type: {
          category: "address",
          value: "address",
          visibility: "private",
        },
      },
      {
        name: "data",
        type: {
          category: "custom",
          value: table_name_to_description_struct_name(table_name),
          visibility: "private",
        },
      }
    ],
  }];
}


const table_program_functions = (table_name, is_view) => {
  return !is_view ? table_program_crud_functions(table_name) : [];
}


const table_program_crud_functions = (table_name) => {
  return [
    table_program_read_function(table_name),
    table_program_update_function(table_name),
    table_program_delete_function(table_name),
  ];
}


const table_program_read_function = (table_name) => {
  return {
    name: table_name_to_insert_transition_name(table_name),
    inputs: [
      {
        name: "r0",
        type: {
          category: "custom",
          value: table_name_to_description_struct_name(table_name),
          visibility: "private",
        },
      },
    ],
    outputs: [
      {
        name: "r1",
        type: {
          category: "custom",
          value: table_name_to_row_record_name(table_name),
          visibility: "record",
        },
      },
    ],
    body: [
      `cast self.signer r0 into r1 as ${table_name_to_row_record_name(table_name)}.record;`
    ],
  };
}


const table_program_update_function = (table_name) => {
  return {
    name: table_name_to_update_transition_name(table_name),
    inputs: [
      {
        name: "r0",
        type: {
          category: "custom",
          value: table_name_to_row_record_name(table_name),
          visibility: "record",
        },
      },
      {
        name: "r1",
        type: {
          category: "custom",
          value: table_name_to_description_struct_name(table_name),
          visibility: "private",
        },
      },
    ],
    outputs: [
      {
        name: "r2",
        type: {
          category: "custom",
          value: table_name_to_row_record_name(table_name),
          visibility: "record",
        },
      },
    ],
    body: [
      `cast self.signer r1 into r2 as ${table_name_to_row_record_name(table_name)}.record;`
    ],
  };
}

const table_program_delete_function = (table_name) => {
  return {
    name: table_name_to_delete_transition_name(table_name),
    inputs: [
      {
        name: "r0",
        type: {
          category: "custom",
          value: table_name_to_row_record_name(table_name),
          visibility: "record",
        },
      },
    ],
    outputs: [],
    body: [],
  };
}


const column_to_aleo_string = ({ attribute, value, aleo_type, ast_type }) => {
  if (ast_type === "number" && aleo_type.category === "integer")
    return `${value}${aleo_type.value}`;

  if (ast_type === "single_quote_string" && aleo_type.value === "address") {
    if (!is_valid_address(value))
      throw Error(`Invalid aleo address : '${value}'.`);
    return `${value}`;
  }

  if (ast_type === "bool" && aleo_type.value === "boolean") {
    return `${value}`;
  }

  throw Error(
    `Input type '${ast_type}' incompatible with aleo type `
    + `'${aleo_type.value}' for value '${value}'.`
  );
};


const row_to_record_string = (row) => {
  let record_acc = "";
  for (const column of row) {
    const aleo_string = column_to_aleo_string(column);
    record_acc += `${column.attribute}:${aleo_string},`;
  }
  if (record_acc.length === 0)
    throw Error("At least one row attribute necessary.");
  record_acc = record_acc.slice(0, record_acc.length - 1);
  return `{${record_acc}}`;
};


const database_from_attribute = (db_attribute) => {
  let database_name = global.context.account.address().to_string();
  if (db_attribute) {
    if (!is_valid_address(db_attribute))
      throw Error("Database should be a valid Aleo address.");
    database_name = db_attribute;
  }
  return database_name;
}


export const get_tables_from_parsed_tables = async (tables) => {
  const froms = []
  if (!tables?.length || tables?.length > 2) {
    throw Error(
      "Only one or two tables are supported for now."
    );
  }
  for (const parsed_from_table of tables) {
    if (parsed_from_table?.expr)
      throw Error(
        "Nested queries are not supported for now."
      );
    froms.push(
      await Table.from_parsed_table(parsed_from_table)
    );
  }
  return froms;
}

export const get_fields_from_parsed_columns = (query_columns, tables) => {
  let fields = [];
  for (const column of query_columns) {
    fields = fields.concat(get_fields_from_parsed_column(column, tables));
  }
  const duplicates = get_duplicates(
    fields.map((row) => row.ref)
  );
  if (duplicates.length > 0) {
    throw Error(
      `Ambigious selected columns: '${duplicates.join(", ")}'. `
      + `Use 'as' to rename them.`
    );
  }
  return fields;
}


export const get_fields_from_parsed_column = (column, tables) => {
  if (column.expr.type === "aggr_func")
    throw Error("Aggregate functions are not supported for now.");
  if (column.expr.type !== "column_ref")
    throw Error("Can only select column references for now.");

  const concerned_tables = !column.expr.table ? tables : (
    tables.filter(
      (table) => table.ref === column.expr.table
    )
  );
  if (concerned_tables.length === 0)
    throw Error(`Table '${column.expr.table}' not found.`);
  const columns = concerned_tables.reduce(
    (accumulated_columns, table) => accumulated_columns.concat(
      table.columns
        .filter((col) => (
          column.expr.column === "*" || col.attribute === column.expr.column
        ))
        .map((col) => ({
          ref: column.as || col.attribute,
          table: table,
          column: col
        }))
    ),
    []
  );

  if (columns.length === 0 && column.expr.column !== "*")
    throw Error(`Column '${column.expr.column}' not found.`);

  return columns;
}


const column_to_attribute = (column) => {
  return {
    name: column.attribute,
    type: column.aleo_type,
  };
}


const query_to_insert_row = (table_columns, query) => {
  const query_attributes =
    zip([query.values[0].value, query.columns])
      .map(([attribute, name]) => ({
        ...attribute,
        name
      }));
  const row = query_attributes_to_insert_row(query_attributes, table_columns);
  throw_incompatible_row_columns(row, table_columns);
  return row;
}


const query_attributes_to_insert_row = (query_attributes, table_columns) => {
  const row = [];
  for (const column of query_attributes) {
    for (const { attribute, aleo_type } of table_columns) {
      if (attribute === column.name) {
        row.push({
          attribute,
          aleo_type,
          sql_type: null,
          value: column.value,
          ast_type: column.type,
        });
        break;
      }
    }
  }
  return row;
}

const throw_incompatible_row_columns = (row, columns) => {
  const expected_colnames = new Set(
    columns.map(
      ({ attribute }) => attribute
    )
  );
  const gotten_colnames = new Set(row.map((row) => row.attribute));

  const missings = ([...diff(expected_colnames, gotten_colnames)]).join(", ");
  if (missings.length > 0)
    throw Error(`Invalid insert query. Missing columns: (${missings})`);

  const extras = ([...diff(gotten_colnames, expected_colnames)]).join(", ");
  if (extras.length > 0)
    throw Error(`Invalid insert query. Extra columns: (${extras})`);
}