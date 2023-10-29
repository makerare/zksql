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