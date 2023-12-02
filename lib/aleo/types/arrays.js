import { is_valid_type, parse_type } from './index.js';

export function is_valid_array(str) {
  if (!str.startsWith('[') || !str.endsWith(']')) {
    return false;
  }
  const inner = str.slice(1, -1).trim();
  let depth = 0;
  let lastSemiPos = -1;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '[') depth++;
    else if (inner[i] === ']') depth--;
    else if (inner[i] === ';' && depth === 0) {
      if (lastSemiPos !== -1) {
        return false;
      }
      lastSemiPos = i;
    }
  }
  if (lastSemiPos === -1) {
    return false;
  }
  const typePart = inner.substring(0, lastSemiPos).trim();
  const sizePart = inner.substring(lastSemiPos + 1).trim();
  const sizePattern = /^\d+u\d+$/;
  if (!sizePattern.test(sizePart)) {
    return false;
  }
  return is_valid_type(typePart) || is_valid_array(typePart);
}


export function parse_array(str) {
  if (!str.startsWith('[') || !str.endsWith(']')) {
    return null;
  }
  const inner = str.slice(1, -1).trim();
  let depth = 0;
  let lastSemiPos = -1;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '[') depth++;
    else if (inner[i] === ']') depth--;
    else if (inner[i] === ';' && depth === 0) {
      if (lastSemiPos !== -1) {
        return null;
      }
      lastSemiPos = i;
    }
  }
  if (lastSemiPos === -1) {
    return null;
  }
  const typePart = inner.substring(0, lastSemiPos).trim();
  const sizePart = inner.substring(lastSemiPos + 1).trim();
  const sizePattern = /^\d+u\d+$/;
  if (!sizePattern.test(sizePart)) {
    return null;
  }

  const type = parse_type(typePart);
  if (!type) {
    return null;
  }
  return { category: "array", value: { element_type: type, size: sizePart } };
}

