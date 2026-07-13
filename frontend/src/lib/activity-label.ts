export function humanizeAction(action: string): string {
  const spaced = action.replace(/[._]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
