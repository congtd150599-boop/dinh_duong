/** Whole calendar months between two ISO dates (d2 - d1), e.g. 2024-01-15 → 2024-03-01 is 1 month, not 2. */
export function monthsBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return years * 12 + months;
}
