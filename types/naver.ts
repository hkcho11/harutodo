export interface NaverCalendarEvent {
  id: string;
  title: string;
  date: string;     // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD (inclusive), null = single day
  allDay: boolean;
}

export interface NaverTokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}
