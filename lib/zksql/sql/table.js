import { zip, diff, get_duplicates, inter } from "../../utils/index.js";
import { Program, column_to_aleo_string, is_valid_address } from "../../aleo/index.js";


export class Table {
  constructor(database_name, table_name, program, { as, is_view }) {
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
        this.columns = struct.attributes.map(
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

  get program_code() {
    return (
      `${this.imports_code}\n`
      + `program ${this.program.id};\n\n`
      + `${this.stucts_code}\n`
      + `${this.records_code}\n`
      + `${this.functions_code}\n`
    );
  }

  get imports_code() {
    return this.imports.map(
      (program) => (`import ${program.id};`)
    ).join("\n");
  }

  get stucts_code() {
    const attributes = this.columns.map(column_to_attribute_definition);
    const attributes_definition = attributes.join("\n");
    return (
      `struct ${this.description_struct_name}:\n`
      + `${attributes_definition}\n`
    );
  }

  get records_code() {
    return (
      `record ${this.row_record_name}:\n`
      + `    owner as address.private;\n`
      + `    data as ${this.description_struct_name}.private;\n\n`
    );
  }

  get functions_code() {
    return (
      `${this.crud_code}\n`
      + ``
    );
  }

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

  new Table(
    database,
    table,
    program,
    {
      as
    }
  );
};



Table.from_columns = function () {
  if (!table) {
    throw Error("No table specified.");
  }
  const database = database_from_attribute(db);
  const program = ;

  new Table(
    database,
    table,
    program,
    {
      as,
      is_view: false
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
  this._load_is_view();
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


const column_to_attribute_definition = (column) => {
  const aleo_type = column.aleo_type;
  const name = column.attribute;
  return `    ${name} as ${aleo_type};`;
}
