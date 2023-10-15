import { integer_types, is_valid_address } from "./types/index.js";


export const sql_datum_to_aleo_string = ({ value, aleo_type, sql_type }) => {
  if (sql_type === "number" && integer_types.includes(aleo_type))
    return `${value}${aleo_type}`;

  if (sql_type === "single_quote_string" && aleo_type === "address") {
    if (!is_valid_address(value))
      throw Error(`Invalid aleo address : '${value}'.`);
    return `${value}`;
  }

  throw Error(
    `SQL type '${sql_type}' incompatible with aleo type `
    + `'${aleo_type}' for value '${value}'.`
  );
};

