export function getNameSafe(val: string): string {
  return val.replace(/[\W_]+/g, "-");
}
