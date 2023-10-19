import { zip, diff, get_duplicates } from "../../utils/index.js";
import { Program, sql_datum_to_aleo_string, is_valid_address } from "../../aleo/index.js";


const INSERT_TRANSITION_NAME = "insert";
const ROW_DATA_STRUCT_NAME = "Addresses3";


export class Table {
  constructor(database_name, table_name, as) {
    this.program = new Program(table_name);
    this.database = database_name;
    this.ref = as || table_name;
  }

  async load() {
    this.program = await this.program.load();
    this._load_columns();
    return this;
  }

  async insert(query) {
    const row = this._query_to_insert_row(query);
    const args = [row_to_record(row)];
    await this.program.call(INSERT_TRANSITION_NAME, args);;
  }


  _load_columns() {
    for (const struct of this.program.structs) {
      if (struct.name === ROW_DATA_STRUCT_NAME) {
        this.columns = struct.attributes;
        return this;
      }
    }
    throw new Error(
      `Record ${ROW_DATA_STRUCT_NAME} was not found in program source code.`
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
            value: attribute.value,
            aleo_type: coltype,
            sql_type: attribute.type,
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
};



const row_to_record = (row) => {
  let record_acc = "";
  for (const { attribute, value, aleo_type, sql_type } of row) {
    const aleo_string = sql_datum_to_aleo_string(
      { value, aleo_type, sql_type }
    );
    record_acc += `${attribute}:${aleo_string},`;
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
      throw Error("Error: database should be a valid Aleo address.");
    database_name = db_attribute;
  }
  return database_name;
}



export const get_column_from_parsed_column = (column, tables) => {
  if (column.expr.type === "aggr_func") {
    throw Error(
      "Error: aggregate functions are not supported for now."
    );
  }
  let table = null;
  for (const in_table of tables) {
    if (in_table.table.ref === column.expr.table) {
      table = in_table.table;
    }
  }
  if (!table) {
    throw Error(
      `Error: column ${column.expr.column} not found in any table.`
    );
  }
  const ref = column.as || column.expr.column;
  return {
    ref,
    table,
    column: column.expr.column,
    out_ref: table.ref + "_" + ref
  };
}


export const get_tables_from_parsed_tables = async (tables) => {
  const froms = []
  if (!tables?.length || tables?.length > 2) {
    throw Error(
      "Error: only one or two tables are supported for now."
    );
  }
  for (const parsed_from_table of tables) {
    if (parsed_from_table?.expr)
      throw Error(
        "Error: nested queries are not supported for now."
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
  const columns = [];
  for (const column of query_columns) {
    columns.push(get_column_from_parsed_column(column, tables));
  }
  const duplicates = get_duplicates(
    columns.map((row) => row.out_ref)
  );
  if (duplicates.length > 0) {
    throw Error(
      `Error: duplicate columns: ${duplicates.join(", ")}.`
    );
  }
  return columns;
}