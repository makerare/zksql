
export * from './integers.js';
export * from './address.js';
export * from './arrays.js';
import { is_valid_array } from './arrays.js';


export function is_valid_type(str) {
  const basicTypePattern = /^((?:[a-zA-Z_]{1}[a-zA-Z0-9_]*\.aleo\/)?(?:[a-zA-Z_]{1}[a-zA-Z0-9_]*))$/;

  if (basicTypePattern.test(str)) {
    return true;
  }

  return is_valid_array(str);
}


export function load_type(str) {
  return load_array(str);
}


export function load_base_type(str) {
  const basicTypePattern = /^((?:[a-zA-Z_]{1}[a-zA-Z0-9_]*\.aleo\/)?(?:[a-zA-Z_]{1}[a-zA-Z0-9_]*))$/;
  const match = str.match(basicTypePattern);
  if (match) {
    return {

    };
  }
  return null;
}