import { zip, diff, get_duplicates } from "../../utils/index.js";
import { Program, column_to_aleo_string, is_valid_address } from "../../aleo/index.js";


export class Table {
  constructor(database_name, table_name, as) {
    this.program = new Program(table_name);
    this.database = database_name;
    this.name = table_name;
    this.ref = as || table_name;
  }

  get description_struct_name() {
    return `RowData_${this.name}`;
  }

  get row_record_name() {
    return `Row_${this.name}`;
  }

  get insert_transition_name() {
    return `insert_${this.name}`;
  }

  get update_transition_name() {
    return `update_${this.name}`;
  }

  get delete_transition_name() {
    return `delete_${this.name}`;
  }

  async load() {
    this.program = await this.program.load();
    this._load_columns();
    return this;
  }

  load_from_columns(columns) {
    this.columns = columns;
    const code = table_to_program_code(this);
    return this.program.load_from_code(code);
  }

  async deploy() {
    return await this.program.deploy();
  }

  async insert(query) {
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
    for (const attribute of query_attributes) {
      for (const { name: colname, type: coltype } of this.columns) {
        if (colname === attribute.name) {
          row.push({
            attribute: colname,
            aleo_type: coltype,
            sql_type: null,
            value: attribute.value,
            ast_type: attribute.type,
          });
          break;
        }
      }
    }
    const expected_colnames = new Set(this.columns.map(
      ({ name }) => name)
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
}


Table.from_parsed_table = async function ({
  table,
  db,
  as
}) {
  if (!table) {
    throw Error("No table specified.");
  }
  const database = database_from_attribute(db);
  return await (
    new Table(
      database,
      table,
      as
    )
  ).load();
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
    const from = {
      ...parsed_from_table,
      table: await Table.from_parsed_table(parsed_from_table),
    };
    froms.push(from);
  }
  return froms;
}

export const get_columns_from_parsed_columns = (query_columns, tables) => {
  let columns = [];
  for (const column of query_columns) {
    columns = columns.concat(get_columns_from_parsed_column(column, tables));
  }
  const duplicates = get_duplicates(
    columns.map((row) => row.ref)
  );
  if (duplicates.length > 0) {
    throw Error(
      `Ambigious selected columns: '${duplicates.join(", ")}'. `
      + `Use 'as' to rename them.`
    );
  }
  return columns;
}


export const get_columns_from_parsed_column = (column, tables) => {
  if (column.expr.type === "aggr_func")
    throw Error("Aggregate functions are not supported for now.");
  if (column.expr.type !== "column_ref")
    throw Error("Can only select column references for now.");

  const concerned_tables = !column.expr.table ? tables : (
    tables.filter(
      ({ table }) => table.ref === column.expr.table
    )
  );
  if (concerned_tables.length === 0)
    throw Error(`Table '${column.expr.table}' not found.`);
  const columns = concerned_tables.reduce(
    (accumulated_columns, table) => accumulated_columns.concat(
      table.table.columns
        .filter((col) => column.expr.column === "*" || col.attribute === column.expr.column)
        .map((col) => ({
          ref: column.as || col.attribute,
          table: table.table,
          column: col.attribute
        }))
    ),
    []
  );

  if (columns.length === 0 && column.expr.column !== "*")
    throw Error(`Column '${column.expr.column}' not found.`);

  return columns;
  /*
  if (column === "column_ref") {
    return FORMER_get_columns_from_parsed_column(column, tables);
  }
  */

}


const table_to_program_code = (table) => {
  const attributes = table.columns.map(column_to_attribute_definition);
  const attributes_definition = attributes.join("\n");

  return (
    `program ${table.program.id};\n\n`
    + `struct ${table.description_struct_name}:\n`
    + `${attributes_definition}\n\n`

    + `record ${table.row_record_name}:\n`
    + `    owner as address.private;\n`
    + `    data as ${table.description_struct_name}.private;\n\n`

    + `function ${table.insert_transition_name}:\n`
    + `    input r0 as ${table.description_struct_name}.private;\n`
    + `    cast self.signer r0 into r1 as ${table.row_record_name}.record;\n`
    + `    output r1 as ${table.row_record_name}.record;\n\n`

    + `function ${table.update_transition_name}:\n`
    + `    input r0 as ${table.row_record_name}.record;\n`
    + `    input r1 as ${table.description_struct_name}.private;\n`
    + `    cast self.signer r1 into r2 as ${table.row_record_name}.record;\n`
    + `    output r2 as ${table.row_record_name}.record;\n\n`

    + `function ${table.delete_transition_name}:\n`
    + `    input r0 as ${table.row_record_name}.record;\n`
  );
}

const column_to_attribute_definition = (column) => {
  const aleo_type = column.aleo_type;
  const name = column.attribute;
  return `    ${name} as ${aleo_type};`;
}