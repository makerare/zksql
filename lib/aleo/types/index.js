
export * from './integers.js';
export * from './address.js';
export * from './arrays.js';
import { is_valid_array, load_array } from './arrays.js';
import { integer_types } from './integers.js';

export function is_valid_type(str) {
  const basicTypePattern = /^((?:[a-zA-Z_]{1}[a-zA-Z0-9_]*\.aleo\/)?(?:[a-zA-Z_]{1}[a-zA-Z0-9_]*))$/;

  if (basicTypePattern.test(str)) {
    return true;
  }

  return is_valid_array(str);
}


export function load_type(str) {
  const base_type = load_base_type(str);
  if (base_type)
    return base_type;
  return load_array(str);
}


export function load_base_type(str) {
  const basicTypePattern = /^(?:([a-zA-Z_]{1}[a-zA-Z0-9_]*)\.aleo\/)?([a-zA-Z_]{1}[a-zA-Z0-9_]*)$/;
  const match = str.match(basicTypePattern);
  if (match) {
    const [_, program_name, type_name] = match;
    console.log(match);
    return {
      ...type_to_category_content(type_name),
      from_program: program_name || null,
    };
  }
  return null;
}

function type_to_category_content(type_name) {
  if (integer_types.includes(type_name))
    return { category: "integer", content: type_name };
  if (integer_types.includes(type_name))
    return { category: "integer", content: type_name };
  return "struct";
}