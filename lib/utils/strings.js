export const hexToBytes = (hex) => {
  var bytes = [];

  for (var c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }

  return bytes;
};


export const remove_comments = (string) => {
  return string.replace(/\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*|^\/\/.*/g, '').trim();//Strip comments
}


export const separate_semi_colons_lines = (s) => {
  let depth = 0;
  let result = '';

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '[') {
      depth++;
      result += s[i];
    } else if (s[i] === ']') {
      depth--;
      result += s[i];
    } else if (s[i] === ';' && depth === 0) {
      result += ';\n';
    } else {
      result += s[i];
    }
  }

  return result;
}