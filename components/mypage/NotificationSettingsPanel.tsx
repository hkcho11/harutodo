"use client";

import { AlertTriangle, Bell, Clock } from "lucide-react";
import TimePickerSheet from "@/components/ui/TimePickerSheet";
import OptionSheet from "@/components/common/OptionSheet";
import NotificationToggleRow from "@/components/mypage/NotificationToggleRow";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAppRefresh } from "@/components/layout/PullToRefresh";

export default function NotificationSettingsPanel() {
  const { notifSettings, notifLoading, notifUpdating, notifRefetch, timePickerTarget,
    setTimePickerTarget, leadMinPickerOpen, setLeadMinPickerOpen, pushPermission,
    handleRequestPush, saveNotif, LEAD_MIN_OPTIONS } = useNotificationPreferences();
  useAppRefresh(notifRefetch);

  return (
    <>
      {/* 알림 설정 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-haru-border px-5 py-4">
          <Bell className="h-4 w-4 text-haru-muted" />
          <h2 className="text-sm font-semibold text-haru-text">알림 종류</h2>
        </div>

        {/* M1: Push 권한 상태 배너 */}
        {pushPermission === "denied" && (
          <div className="flex items-start gap-2 border-b border-haru-border bg-haru-danger/5 px-5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-haru-danger" />
            <p className="text-xs leading-relaxed text-haru-danger">
              이 기기에서 알림이 차단됐어요. 브라우저 설정에서 알림을 허용해주세요.
            </p>
          </div>
        )}
        {pushPermission === "default" && (
          <div className="flex items-center justify-between gap-3 border-b border-haru-border bg-haru-primary-soft/50 px-5 py-3">
            <p className="text-xs leading-relaxed text-haru-text">
              알림을 받으려면 이 기기에서 허용이 필요해요
            </p>
            <button
              type="button"
              onClick={() => void handleRequestPush()}
              className="shrink-0 rounded-xl bg-haru-primary min-h-11 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary text-xs font-semibold text-haru-text active:bg-haru-primary-active"
            >
              허용
            </button>
          </div>
        )}

        {notifLoading ? (
          <p className="px-5 py-4 text-sm text-haru-muted">불러오는 중...</p>
        ) : !notifSettings ? (
          <div className="px-5 py-4">
            <p className="text-sm text-haru-muted">설정을 불러오지 못했어요</p>
            <button type="button" onClick={() => void notifRefetch()} className="mt-2 min-h-11 rounded-xl bg-haru-primary px-4 text-sm font-semibold text-haru-text">다시 시도</button>
          </div>
        ) : (
          <div className="divide-y divide-haru-border">
            {/* 아침 알림 */}
            <div className="flex flex-col gap-2 px-5 py-4">
              <NotificationToggleRow
                label="아침 알림"
                description="오늘의 할 일·일정 요약을 보내드려요"
                checked={notifSettings.morning_enabled}
                onChange={(v) => saveNotif({ morning_enabled: v })}
                disabled={notifUpdating}
              />
              {notifSettings.morning_enabled && (
                <div className="flex items-center gap-2 pl-1">
                  <label className="text-xs text-haru-muted">알림 시각</label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget("morning")}
                    disabled={notifUpdating}
                    className="flex items-center gap-1.5 rounded-xl border border-haru-border bg-haru-surface min-h-11 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary text-sm text-haru-text active:bg-haru-primary-soft disabled:opacity-40"
                  >
                    <Clock className="h-3.5 w-3.5 text-haru-muted" />
                    {notifSettings.morning_time.slice(0, 5)}
                  </button>
                </div>
              )}
            </div>

            {/* 일정 알림 */}
            <div className="flex flex-col gap-2 px-5 py-4">
              <NotificationToggleRow
                label="일정 알림"
                description="일정 시작 전 미리 알려드려요"
                checked={notifSettings.event_enabled}
                onChange={(v) => saveNotif({ event_enabled: v })}
                disabled={notifUpdating}
              />
              {notifSettings.event_enabled && (
                <div className="flex items-center gap-2 pl-1">
                  <label className="text-xs text-haru-muted">미리 알림</label>
                  <button
                    type="button"
                    onClick={() => setLeadMinPickerOpen(true)}
                    disabled={notifUpdating}
                    className="flex items-center gap-1 rounded-xl border border-haru-border bg-haru-surface min-h-11 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary text-sm text-haru-text active:bg-haru-primary-soft disabled:opacity-40"
                  >
                    {LEAD_MIN_OPTIONS.find((o) => o.value === notifSettings.event_lead_min)?.label ?? "30분 전"}
                  </button>
                </div>
              )}
            </div>

            {/* 저녁 알림 */}
            <div className="flex flex-col gap-2 px-5 py-4">
              <NotificationToggleRow
                label="저녁 알림"
                description="남은 할 일을 저녁에 다시 알려드려요"
                checked={notifSettings.evening_enabled}
                onChange={(v) => saveNotif({ evening_enabled: v })}
                disabled={notifUpdating}
              />
              {notifSettings.evening_enabled && (
                <div className="flex items-center gap-2 pl-1">
                  <label className="text-xs text-haru-muted">알림 시각</label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget("evening")}
                    disabled={notifUpdating}
                    className="flex items-center gap-1.5 rounded-xl border border-haru-border bg-haru-surface min-h-11 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary text-sm text-haru-text active:bg-haru-primary-soft disabled:opacity-40"
                  >
                    <Clock className="h-3.5 w-3.5 text-haru-muted" />
                    {notifSettings.evening_time.slice(0, 5)}
                  </button>
                </div>
              )}
            </div>

            {/* 파트너 활동 알림 */}
            <div className="px-5 py-4">
              <NotificationToggleRow
                label="파트너 활동 알림"
                description="파트너가 할 일·일정을 추가·수정하면 알려드려요"
                checked={notifSettings.partner_enabled}
                onChange={(v) => saveNotif({ partner_enabled: v })}
                disabled={notifUpdating}
              />
            </div>

            {/* 내용 표시 */}
            <div className="px-5 py-4">
              <NotificationToggleRow
                label="알림에 내용 표시"
                description="알림 배너에 일정·할 일 제목과 날짜가 표시돼요"
                checked={notifSettings.show_content}
                onChange={(v) => saveNotif({ show_content: v })}
                disabled={notifUpdating}
              />
            </div>
          </div>
        )}
      </section>

      {/* 일정 알림 미리 알림 선택 */}
      <OptionSheet
        open={leadMinPickerOpen}
        title="미리 알림"
        options={LEAD_MIN_OPTIONS}
        value={notifSettings?.event_lead_min ?? 30}
        onSelect={(v) => saveNotif({ event_lead_min: v })}
        onClose={() => setLeadMinPickerOpen(false)}
      />

      {/* 알림 시각 선택 */}
      <TimePickerSheet
        open={timePickerTarget !== null}
        value={
          timePickerTarget === "morning"
            ? notifSettings?.morning_time.slice(0, 5) ?? null
            : notifSettings?.evening_time.slice(0, 5) ?? null
        }
        title={timePickerTarget === "morning" ? "아침 알림 시각" : "저녁 알림 시각"}
        allowClear={false}
        onConfirm={(v) => {
          if (!v) return;
          if (timePickerTarget === "morning") saveNotif({ morning_time: v });
          else saveNotif({ evening_time: v });
        }}
        onClose={() => setTimePickerTarget(null)}
      />

    </>
  );
}
