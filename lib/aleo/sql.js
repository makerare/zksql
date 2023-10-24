import { integer_types, is_valid_address } from "./types/index.js";


export const column_to_aleo_string = ({ attribute, value, aleo_type, ast_type }) => {
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

