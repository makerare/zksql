import { zip, diff } from "./utils/index.js";
import { Program, sql_datum_to_aleo_string, is_valid_address } from "./aleo/index.js";


const INSERT_TRANSITION_NAME = "insert";
const ROW_DATA_STRUCT_NAME = "Addresses3";


export class Table {
  constructor(table_identifier) {
    const {
      program_name,
      owner,
      source
    } = parse_table_identifier(table_identifier);
    this.program = new Program(program_name);
    this.owner = owner;
    this.source = source;
  }

  async load() {
    this.program = await this.program.load();
    this._load_columns();
    return this;
  }

  async insert(query) {
    const row = this._query_to_insert_row(query);
    const args = [this.owner, row_to_record(row)];
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
      ({ name: colname, type: coltype }) => colname)
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


const parse_table_identifier_no_check = (table_identifier) => {
  const parsed = {};

  const pattern1_regex = /([_a-zA-Z]{1}[_a-zA-Z0-9]*)\/([_a-zA-Z]{1}[_a-zA-Z0-9]*):([_a-zA-Z]{1}[_a-zA-Z0-9]*)/g;
  const {
    value: pattern1_groups,
    done: pattern1_no_match
  } = table_identifier.matchAll(pattern1_regex).next();
  if (!pattern1_no_match) {
    parsed.program_name = pattern1_groups[1];
    parsed.owner = pattern1_groups[2];
    parsed.source = pattern1_groups[3];
    return parsed;
  }

  const pattern2_regex = /([_a-zA-Z]{1}[_a-zA-Z0-9]*)\/([_a-zA-Z]{1}[_a-zA-Z0-9]*)/g;
  const {
    value: pattern2_groups,
    done: pattern2_no_match
  } = table_identifier.matchAll(pattern2_regex).next();
  if (!pattern2_no_match) {
    parsed.program_name = pattern2_groups[1];
    parsed.owner = pattern2_groups[2];
    parsed.source = global.context.account.address().to_string();
    return parsed;
  }

  const pattern3_regex = /([_a-zA-Z]{1}[_a-zA-Z0-9]*)/g;
  const {
    value: pattern3_groups,
    done: pattern3_no_match
  } = table_identifier.matchAll(pattern3_regex).next();
  if (!pattern3_no_match) {
    parsed.program_name = pattern3_groups[1];

    parsed.owner = global.context.account.address().to_string();
    parsed.source = global.context.account.address().to_string();
    return parsed;
  }
  throw Error(`Invalid table identifier: '${table_identifier}'.`);
}


const parse_table_identifier = (table_identifier) => {
  const parsed = parse_table_identifier_no_check(table_identifier);

  if (parsed.owner === "self")
    parsed.owner = self;
  if (parsed.source === "self")
    parsed.source = self;

  if (!is_valid_address(parsed.owner))
    throw Error(`Invalid table owner address: '${parsed.owner}'.`);
  if (!is_valid_address(parsed.source))
    throw Error(`Invalid table source address: '${parsed.source}'.`);
  return parsed;
}
