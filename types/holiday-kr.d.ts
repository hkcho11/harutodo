declare module "holiday-kr" {
  export function isHoliday(date: Date): boolean;
  export function isLunarHoliday(date: Date): boolean;
  export function isSolarHoliday(date: Date): boolean;
}
