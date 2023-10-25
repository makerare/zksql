export const diff = (a, b) => new Set([...a].filter(x => !b.has(x)));
export const inter = (a, b) => new Set([...a].filter(i => b.has(i)));