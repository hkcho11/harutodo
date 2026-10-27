export function getKoreanHolidayLabel(name: string): string {
  return name.replace(/\s+/g, "");
}

export function getKoreanHolidayLabelLines(name: string): string[] {
  const label = getKoreanHolidayLabel(name);
  const substituteSuffix = "대체공휴일";
  if (!label.endsWith(substituteSuffix)) return [label];

  const origin = label.slice(0, -substituteSuffix.length);
  return [origin, substituteSuffix].filter(Boolean);
}
