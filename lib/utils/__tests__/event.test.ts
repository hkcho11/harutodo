import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatEventLabel,
  formatEventTimeRange,
  eventColorClass,
  eventColorClassSoft,
} from "../event";
import type { Event } from "@/types/event";

function makeEvent(fields: Partial<Event> = {}): Event {
  return {
    id: "test-id",
    couple_id: "couple-id",
    created_by: "user-id",
    assignee_id: null,
    title: "테스트 일정",
    date: "2026-06-14",
    start_time: null,
    end_time: null,
    end_date: null,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    ...fields,
  } as unknown as Event;
}

describe("formatTime", () => {
  it("HH:MM:SS를 HH:MM으로 자름", () => {
    expect(formatTime("09:30:00")).toBe("09:30");
  });

  it("HH:MM 형식은 그대로 반환", () => {
    expect(formatTime("14:00")).toBe("14:00");
  });

  it("null 입력은 null 반환", () => {
    expect(formatTime(null)).toBeNull();
  });

  it("자정 표기", () => {
    expect(formatTime("00:00:00")).toBe("00:00");
  });
});

describe("formatEventLabel", () => {
  it("시간 있음 — 시간 prefix 포함", () => {
    const event = makeEvent({ title: "팀 회의", start_time: "09:30:00" });
    expect(formatEventLabel(event)).toBe("09:30 팀 회의");
  });

  it("시간 없음 — 제목만 반환", () => {
    const event = makeEvent({ title: "생일", start_time: null });
    expect(formatEventLabel(event)).toBe("생일");
  });

  it("start_time이 HH:MM 형식이어도 정상 동작", () => {
    const event = makeEvent({ title: "점심", start_time: "12:00" });
    expect(formatEventLabel(event)).toBe("12:00 점심");
  });
});

describe("formatEventTimeRange", () => {
  it("end_date 있음 — N박 M일 형식", () => {
    const event = makeEvent({ date: "2026-07-01", end_date: "2026-07-03" });
    expect(formatEventTimeRange(event)).toBe("2박 3일");
  });

  it("1박 2일", () => {
    const event = makeEvent({ date: "2026-07-01", end_date: "2026-07-02" });
    expect(formatEventTimeRange(event)).toBe("1박 2일");
  });

  it("start_time + end_time 있음 — 시간 범위 형식", () => {
    const event = makeEvent({ start_time: "09:00:00", end_time: "10:30:00" });
    expect(formatEventTimeRange(event)).toBe("09:00 – 10:30");
  });

  it("시간 모두 없음 — 종일", () => {
    const event = makeEvent({ start_time: null, end_time: null });
    expect(formatEventTimeRange(event)).toBe("종일");
  });

  it("start_time만 있음 — ~부터 형식", () => {
    const event = makeEvent({ start_time: "14:00:00", end_time: null });
    expect(formatEventTimeRange(event)).toBe("14:00부터");
  });

  it("end_time만 있음 — ~까지 형식", () => {
    const event = makeEvent({ start_time: null, end_time: "18:00:00" });
    expect(formatEventTimeRange(event)).toBe("18:00까지");
  });
});

describe("eventColorClass", () => {
  it("assignee_id null — 함께(secondary) 색상", () => {
    expect(eventColorClass({ assignee_id: null }, "user-1")).toBe(
      "bg-haru-secondary text-haru-text"
    );
  });

  it("assignee_id === meId — 본인(primary) 색상", () => {
    expect(eventColorClass({ assignee_id: "user-1" }, "user-1")).toBe(
      "bg-haru-primary text-haru-text"
    );
  });

  it("assignee_id !== meId — 파트너(accent) 색상", () => {
    expect(eventColorClass({ assignee_id: "user-2" }, "user-1")).toBe(
      "bg-haru-accent text-haru-text"
    );
  });

  it("meId null이고 assignee_id 있음 — 파트너(accent) 색상", () => {
    expect(eventColorClass({ assignee_id: "user-2" }, null)).toBe(
      "bg-haru-accent text-haru-text"
    );
  });
});

describe("eventColorClassSoft", () => {
  it("assignee_id null — 함께(secondary/60) 색상", () => {
    expect(eventColorClassSoft({ assignee_id: null }, "user-1")).toBe(
      "bg-haru-secondary/60 text-haru-text"
    );
  });

  it("assignee_id === meId — 본인(primary/60) 색상", () => {
    expect(eventColorClassSoft({ assignee_id: "user-1" }, "user-1")).toBe(
      "bg-haru-primary/60 text-haru-text"
    );
  });

  it("assignee_id !== meId — 파트너(accent/60) 색상", () => {
    expect(eventColorClassSoft({ assignee_id: "user-2" }, "user-1")).toBe(
      "bg-haru-accent/60 text-haru-text"
    );
  });
});
