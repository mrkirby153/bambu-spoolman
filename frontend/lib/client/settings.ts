export function getTrayIndex(ams: number | undefined, tray: number) {
  if (ams === undefined) {
    return tray;
  }
  return ams * 4 + tray;
}
