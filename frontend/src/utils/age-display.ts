/** Pure date-arithmetic display helper — NOT clinical logic (that lives server-side). */
export function computeAgeDisplay(dob: string, examDate: string): { text: string; totalMonths: number } | null {
  if (!dob || !examDate) return null;
  const d1 = new Date(dob);
  const d2 = new Date(examDate);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()) || d2 < d1) return null;

  let years = d2.getFullYear() - d1.getFullYear();
  let months = d2.getMonth() - d1.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalMonths = years * 12 + months;
  const text = years > 0 ? `${years} tuổi ${months} tháng (${totalMonths} tháng)` : `${totalMonths} tháng tuổi`;
  return { text, totalMonths };
}
