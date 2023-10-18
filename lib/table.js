import { zip, diff } from "./utils/index.js";
import { Program, sql_datum_to_aleo_string, is_valid_address } from "./aleo/index.js";


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

