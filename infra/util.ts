export function getNameSafe(val: string): string {
  return val.replace(/[\W_]+/g, "-");
}

export function getSafeResourceName(val: string): string {
  let shortVal = val.slice(0, 60);
  while (/[^a-zA-Z0-9]$/.test(shortVal)) {
    shortVal = shortVal.slice(0, shortVal.length - 2);
  }
  return shortVal;
}
