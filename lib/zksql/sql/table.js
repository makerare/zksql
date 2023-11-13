import { zip, diff, get_duplicates, inter } from "../../utils/index.js";
import { Program, is_valid_address, integer_types } from "../../aleo/index.js";


export class Table {
  constructor(database_name, table_name, program, { as }) {
    this.program = program;
    this.database = database_name;
    this.name = table_name;
    this.ref = as || table_name;
    this.imports = [];
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

  async deploy() {
    return await this.program.deploy();
  }

  async insert(query) {
    if (this.is_view)
      throw Error("Cannot insert into a view.");

    const row = this._query_to_insert_row(query);
    const args = [row_to_record(row)];
    await this.program.call(this.insert_transition_name, args);;
  }

  _load_columns() {
    for (const struct of this.program.structs) {
      if (struct.name === this.description_struct_name) {
        this.columns = struct.fields.map(
          ({ name, type }) => ({
            attribute: name,
            aleo_type: type,
            sql_type: null,
            ast_type: null,
          })
        );
        return this;
      }
    }
    throw new Error(
      `Struct '${this.description_struct_name}' `
      + `was not found in program source code.`
    );
  }

  _query_to_insert_row(query) {
    const query_attributes =
      zip([query.values[0].value, query.columns])
        .map(([attribute, name]) => ({
          ...attribute,
          name
        }));
    const row = [];
    for (const column of query_attributes) {
      for (const { attribute, aleo_type } of this.columns) {
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
    const expected_colnames = new Set(this.columns.map(
      ({ attribute }) => attribute)
    );
    const got_colnames = new Set(row.map((row) => row.attribute));

    const missings = ([...diff(expected_colnames, got_colnames)]).join(", ");
    const extras = ([...diff(got_colnames, expected_colnames)]).join(", ");
    if (missings.length > 0)
      throw Error(`Invalid insert query. Missing columns: (${missings})`);
    if (extras.length > 0)
      throw Error(`Invalid insert query. Extra columns: (${extras})`);

    return row;
  }

  deploy() {
    return this.program.deploy();
  }
}


Table.from_parsed_table = async function ({
  db,
  table,
  as
}) {
  if (!table) {
    throw Error("No table specified.");
  }
  const database = database_from_attribute(db);
  const program = await Program.from_deployed(table);

  return new Table(
    database,
    table,
    program,
    {
      as
    }
  );
};


Table.from_columns = function (database_name, table_name, columns) {
  const program = table_program_from_columns(table_name, columns);
  return new Table(
    database_name,
    table_name,
    program,
    {
      as
    }
  );
};


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


const table_program_from_columns = (table_name, columns) => {
  return new Program(
    table_name,
    {
      imports: [],
      structs: table_program_structs(table_name, columns),
      records: table_program_records(table_name),
      mappings: [],
      closures: [],
      functions: table_program_functions(table_name),
    }
  );
}

const table_program_structs = (columns) => {
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
          name: "address",
          visibility: "private",
        },
      },
      {
        name: "data",
        type: {
          category: "custom",
          name: table_name_to_description_struct_name(table_name),
          visibility: "private",
        },
      }
    ],
  }];
}


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


`
async load() {
  this.program = await this.program.load();
  this._load_columns();
  return this;
}

load_from_columns(columns) {
  this.columns = columns;
  this.program.load_from_code(this.program_code);
  return this;
}

load_from_select_query(query, froms, fields) {
  this.imports = froms.map(({ program }) => program);

  const columns = fields.map(({ column, ref }) => ({
    ...column,
    attribute: ref,
  }));
  this.load_from_columns(columns);

  console.log(this.program_code)
  return this;
}
`

/*
get crud_code() {
    return !this.is_view ? `` : (
      `function ${this.insert_transition_name}:\n`
      + `    input r0 as ${this.description_struct_name}.private;\n`
      + `    cast self.signer r0 into r1 as ${this.row_record_name}.record;\n`
      + `    output r1 as ${this.row_record_name}.record;\n\n`

      + `function ${this.update_transition_name}:\n`
      + `    input r0 as ${this.row_record_name}.record;\n`
      + `    input r1 as ${this.description_struct_name}.private;\n`
      + `    cast self.signer r1 into r2 as ${this.row_record_name}.record;\n`
      + `    output r2 as ${this.row_record_name}.record;\n\n`

      + `function ${this.delete_transition_name}:\n`
      + `    input r0 as ${this.row_record_name}.record;\n\n`
    )
  }

  */

const column_to_aleo_string = ({ attribute, value, aleo_type, ast_type }) => {
  if (ast_type === "number" && integer_types.includes(aleo_type))
    return `${value}${aleo_type}`;

  if (ast_type === "single_quote_string" && aleo_type === "address") {
    if (!is_valid_address(value))
      throw Error(`Invalid aleo address : '${value}'.`);
    return `${value}`;
  }

  if (ast_type === "bool" && aleo_type === "boolean") {
    return `${value}`;
  }

  throw Error(
    `Input type '${ast_type}' incompatible with aleo type `
    + `'${aleo_type}' for value '${value}'.`
  );
};



const row_to_record = (row) => {
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
    type: column.aleo_type
  };
}
