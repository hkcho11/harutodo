"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X, Pencil, LogOut, ChevronRight, AlertTriangle, Bell, Clock, Link2, Link2Off } from "lucide-react";
import TimePickerSheet from "@/components/ui/TimePickerSheet";
import OptionSheet from "@/components/common/OptionSheet";
import AvatarColorSheet from "@/components/mypage/AvatarColorSheet";
import { signOut } from "@/lib/services/authService";
import {
  getNaverCalendarStatus,
  connectNaverCalendar,
  disconnectNaverCalendar,
} from "@/lib/services/naverCalendarService";
import { updateProfile } from "@/lib/services/profileService";
import { disconnectCouple } from "@/lib/services/coupleService";
import { getAvatarColor, AVATAR_COLOR_CLASSES, type AvatarColor } from "@/lib/utils/avatarColor";
import { subscribePush } from "@/lib/services/pushService";
import {
  MAX_CUSTOM_GROUPS_PER_COUPLE,
  ERR_GROUP_LIMIT_EXCEEDED,
} from "@/lib/services/customGroupService";
import { useCustomGroups } from "@/hooks/useCustomGroups";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useToastStore } from "@/store/useToastStore";
import { useCoupleStore } from "@/store/useCoupleStore";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import LoadingScreen from "@/components/common/LoadingScreen";
import { cn } from "@/lib/utils/cn";
import type { CustomGroup } from "@/types/todo";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-haru-text">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-haru-muted">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
          checked ? "bg-haru-primary" : "bg-haru-border"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          )}
        />
      </button>
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const updateMe = useCoupleStore((s) => s.updateMe);
  const reset = useCoupleStore((s) => s.reset);
  const { groups, loading, error, refetch, add, remove } = useCustomGroups();
  const showToast = useToastStore((s) => s.show);

  // 프로필 수정
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // 아바타 색상 변경
  const [colorSheetOpen, setColorSheetOpen] = useState(false);
  const [isSavingColor, setIsSavingColor] = useState(false);

  const handleColorSelect = async (color: AvatarColor) => {
    if (!me) return;
    setIsSavingColor(true);
    try {
      await updateProfile(me.id, { avatar_color: color });
      updateMe({ avatar_color: color });
      setColorSheetOpen(false);
    } catch {
      showToast("색상 변경에 실패했어요. 다시 시도해주세요");
    } finally {
      setIsSavingColor(false);
    }
  };

  const startEditName = () => {
    setNameInput(me?.display_name ?? "");
    setEditingName(true);
  };
  const cancelEditName = () => {
    setEditingName(false);
    setNameInput("");
  };
  const saveEditName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !me) return;
    if (trimmed === me.display_name) {
      cancelEditName();
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfile(me.id, { display_name: trimmed });
      updateMe({ display_name: trimmed });
      setEditingName(false);
    } catch {
      showToast("프로필 수정에 실패했어요. 다시 시도해주세요");
    } finally {
      setIsSavingName(false);
    }
  };

  // 로그아웃
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      showToast("로그아웃에 실패했어요. 다시 시도해주세요");
      setIsLoggingOut(false);
    }
  };

  // 커플 연결 해제
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const handleDisconnect = async () => {
    if (!coupleId) return;
    setIsDisconnecting(true);
    try {
      await disconnectCouple(coupleId);
      reset();
      router.push("/couple/connect");
    } catch {
      showToast("연결 해제에 실패했어요. 다시 시도해주세요");
      setIsDisconnecting(false);
      setDisconnectOpen(false);
    }
  };

  // 커스텀 그룹 생성
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  // 커스텀 그룹 삭제
  const [pendingDelete, setPendingDelete] = useState<CustomGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const submitNewGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await add(trimmed);
      setNewGroupName("");
      setAddingGroup(false);
    } catch (e) {
      const msg =
        (e as Error).message === ERR_GROUP_LIMIT_EXCEEDED
          ? `커스텀 그룹은 최대 ${MAX_CUSTOM_GROUPS_PER_COUPLE}개까지만 만들 수 있어요`
          : "그룹 생성에 실패했어요. 다시 시도해주세요";
      showToast(msg);
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await remove(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      showToast("그룹 삭제에 실패했어요. 다시 시도해주세요");
    } finally {
      setIsDeleting(false);
    }
  };

  const {
    settings: notifSettings,
    loading: notifLoading,
    updating: notifUpdating,
    update: notifUpdate,
  } = useNotificationSettings(me?.id);

  const [timePickerTarget, setTimePickerTarget] = useState<"morning" | "evening" | null>(null);
  const [leadMinPickerOpen, setLeadMinPickerOpen] = useState(false);

  // 네이버 캘린더 연동 상태
  const [naverConnected, setNaverConnected] = useState<boolean | null>(null);
  const [naverLoading, setNaverLoading] = useState(false);

  const loadNaverStatus = useCallback(async () => {
    const connected = await getNaverCalendarStatus();
    setNaverConnected(connected);
  }, []);

  // OAuth 콜백 결과 처리 — URL param → localStorage → 토스트
  // localStorage 경유로 저장해두면 PWA가 재실행된 뒤 마이페이지 재진입 시에도 토스트가 표시됨
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlResult = params.get("naver_calendar");
    if (urlResult) {
      localStorage.setItem("naverCalendarResult", urlResult);
      const url = new URL(window.location.href);
      url.searchParams.delete("naver_calendar");
      window.history.replaceState({}, "", url.toString());
    }
    const pending = localStorage.getItem("naverCalendarResult");
    if (pending) {
      localStorage.removeItem("naverCalendarResult");
      if (pending === "connected") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNaverConnected(true);
        showToast("네이버 캘린더가 연결됐어요");
      } else if (pending === "error") {
        showToast("네이버 캘린더 연결에 실패했어요");
      }
    } else {
      void loadNaverStatus();
    }
  // 마운트 1회만 실행 (showToast·loadNaverStatus는 안정된 레퍼런스)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNaverConnect = () => {
    connectNaverCalendar();
  };

  const handleNaverDisconnect = async () => {
    setNaverLoading(true);
    try {
      await disconnectNaverCalendar();
      setNaverConnected(false);
      showToast("네이버 캘린더 연결이 해제됐어요");
    } catch {
      showToast("연결 해제에 실패했어요. 다시 시도해주세요");
    } finally {
      setNaverLoading(false);
    }
  };

  // M1: Push 권한 상태 — SSR과 초기 클라이언트 렌더 일치를 위해 "unavailable"로 초기화
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unavailable">("unavailable");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushPermission(Notification.permission);
  }, []);

  const handleRequestPush = async () => {
    if (!me?.id) return;
    const ok = await subscribePush(me.id);
    setPushPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unavailable");
    if (ok) showToast("이 기기에서 알림이 허용됐어요");
    else showToast("알림 허용이 필요해요");
  };

  // M2: 설정 저장 실패 toast
  const saveNotif = (patch: Parameters<typeof notifUpdate>[0]) => {
    notifUpdate(patch).catch(() => showToast("알림 설정 저장에 실패했어요. 다시 시도해주세요"));
  };

  const LEAD_MIN_OPTIONS: { label: string; value: number }[] = [
    { label: "15분 전", value: 15 },
    { label: "30분 전", value: 30 },
    { label: "1시간 전", value: 60 },
  ];

  const meInitial = me?.display_name?.charAt(0)?.toUpperCase() ?? "?";
  const partnerInitial = partner?.display_name?.charAt(0)?.toUpperCase() ?? "?";

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-haru-text">마이페이지</h1>

      {/* 프로필 카드 */}
      <section className="rounded-3xl bg-haru-surface p-6 shadow-card">
        {/* 아바타 + 이름 */}
        <div className="flex items-start justify-center gap-6">
          {/* 나 */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setColorSheetOpen(true)}
              aria-label="프로필 색상 변경"
              className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-full active:opacity-80",
                AVATAR_COLOR_CLASSES[getAvatarColor(me?.avatar_color)].avatarBg
              )}
            >
              <span className="text-2xl font-bold text-haru-text">{meInitial}</span>
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-haru-surface shadow-card">
                <Pencil className="h-2.5 w-2.5 text-haru-muted" />
              </span>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-haru-text">
                {me?.display_name ?? "—"}
              </span>
              {!editingName && (
                <button
                  type="button"
                  onClick={startEditName}
                  aria-label="이름 수정"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-haru-muted active:bg-haru-primary-soft"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="text-xs text-haru-muted">나</span>
          </div>

          {/* 커플 연결 심볼 */}
          <div className="mt-4 flex h-16 items-center">
            <span className="select-none text-2xl leading-none text-haru-border">∞</span>
          </div>

          {/* 파트너 */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                AVATAR_COLOR_CLASSES[getAvatarColor(partner?.avatar_color)].avatarBg
              )}
            >
              <span className="text-2xl font-bold text-haru-text">{partnerInitial}</span>
            </div>
            <span className="text-sm font-semibold text-haru-text">
              {partner?.display_name ?? "—"}
            </span>
            <span className="text-xs text-haru-muted">파트너</span>
          </div>
        </div>

        {/* 이름 편집 영역 */}
        {editingName && (
          <div className="mt-5 flex items-center gap-2 border-t border-haru-border pt-5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveEditName();
                }
                if (e.key === "Escape") cancelEditName();
              }}
              maxLength={30}
              autoFocus
              disabled={isSavingName}
              placeholder="새 이름을 입력해주세요"
              className="min-h-[44px] flex-1 rounded-xl border border-haru-primary bg-haru-surface px-3 text-sm text-haru-text outline-none focus:ring-2 focus:ring-haru-primary-soft disabled:opacity-50"
            />
            <button
              type="button"
              onClick={saveEditName}
              disabled={isSavingName || !nameInput.trim()}
              aria-label="저장"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-haru-primary text-haru-text active:bg-haru-primary-active disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={cancelEditName}
              aria-label="취소"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-haru-border text-haru-muted active:bg-haru-primary-soft"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* 커스텀 그룹 카드 */}
      <section className="rounded-2xl bg-haru-surface p-5 shadow-card">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-haru-text">커스텀 그룹</h2>
          <span className="text-xs text-haru-muted">
            {groups.length} / {MAX_CUSTOM_GROUPS_PER_COUPLE}
          </span>
        </header>

        {loading ? (
          <p className="py-4 text-center text-sm text-haru-muted">
            불러오는 중...
          </p>
        ) : error ? (
          <div className="py-4 text-center">
            <p className="text-sm text-haru-danger">그룹을 불러오지 못했어요</p>
            <p className="mt-1 text-xs text-haru-muted">
              네트워크 상태를 확인하고 다시 시도해주세요
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-xl border border-haru-border px-4 py-2 text-sm font-medium text-haru-text active:bg-haru-primary-soft"
            >
              다시 시도
            </button>
          </div>
        ) : groups.length === 0 && !addingGroup ? (
          <p className="py-4 text-center text-xs text-haru-muted">
            아직 그룹이 없어요
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-haru-border px-3 py-2"
              >
                <span className="truncate text-sm text-haru-text">{g.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(g)}
                  aria-label={`${g.name} 삭제`}
                  className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-haru-danger active:bg-haru-primary-soft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {addingGroup ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitNewGroup();
                }
                if (e.key === "Escape") {
                  setAddingGroup(false);
                  setNewGroupName("");
                }
              }}
              placeholder="그룹 이름"
              maxLength={50}
              autoFocus
              disabled={creating}
              className="min-h-[44px] flex-1 rounded-xl border border-haru-primary bg-haru-surface px-3 text-sm text-haru-text outline-none focus:ring-2 focus:ring-haru-primary-soft"
            />
            <button
              type="button"
              onClick={submitNewGroup}
              disabled={creating || !newGroupName.trim()}
              aria-label="만들기"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-haru-primary text-haru-text active:bg-haru-primary-active disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingGroup(false);
                setNewGroupName("");
              }}
              aria-label="취소"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-haru-border text-haru-muted active:bg-haru-primary-soft"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : groups.length >= MAX_CUSTOM_GROUPS_PER_COUPLE ? (
          <p className="mt-3 text-center text-xs text-haru-muted">
            최대 {MAX_CUSTOM_GROUPS_PER_COUPLE}개까지 만들 수 있어요
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setAddingGroup(true)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-haru-border py-2 text-sm font-medium text-haru-muted active:bg-haru-primary-soft"
          >
            <Plus className="h-4 w-4" />새 그룹
          </button>
        )}
      </section>

      {/* 알림 설정 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-haru-border px-5 py-4">
          <Bell className="h-4 w-4 text-haru-muted" />
          <h2 className="text-sm font-semibold text-haru-text">알림 설정</h2>
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
              className="shrink-0 rounded-xl bg-haru-primary px-3 py-1.5 text-xs font-semibold text-haru-text active:bg-haru-primary-active"
            >
              허용
            </button>
          </div>
        )}

        {notifLoading ? (
          <p className="px-5 py-4 text-sm text-haru-muted">불러오는 중...</p>
        ) : !notifSettings ? (
          <p className="px-5 py-4 text-sm text-haru-muted">설정을 불러오지 못했어요</p>
        ) : (
          <div className="divide-y divide-haru-border">
            {/* 아침 알림 */}
            <div className="flex flex-col gap-2 px-5 py-4">
              <ToggleRow
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
                    className="flex items-center gap-1.5 rounded-xl border border-haru-border bg-haru-surface px-3 py-1.5 text-sm text-haru-text active:bg-haru-primary-soft disabled:opacity-40"
                  >
                    <Clock className="h-3.5 w-3.5 text-haru-muted" />
                    {notifSettings.morning_time.slice(0, 5)}
                  </button>
                </div>
              )}
            </div>

            {/* 일정 알림 */}
            <div className="flex flex-col gap-2 px-5 py-4">
              <ToggleRow
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
                    className="flex items-center gap-1 rounded-xl border border-haru-border bg-haru-surface px-3 py-1.5 text-sm text-haru-text active:bg-haru-primary-soft disabled:opacity-40"
                  >
                    {LEAD_MIN_OPTIONS.find((o) => o.value === notifSettings.event_lead_min)?.label ?? "30분 전"}
                  </button>
                </div>
              )}
            </div>

            {/* 저녁 알림 */}
            <div className="flex flex-col gap-2 px-5 py-4">
              <ToggleRow
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
                    className="flex items-center gap-1.5 rounded-xl border border-haru-border bg-haru-surface px-3 py-1.5 text-sm text-haru-text active:bg-haru-primary-soft disabled:opacity-40"
                  >
                    <Clock className="h-3.5 w-3.5 text-haru-muted" />
                    {notifSettings.evening_time.slice(0, 5)}
                  </button>
                </div>
              )}
            </div>

            {/* 파트너 활동 알림 */}
            <div className="px-5 py-4">
              <ToggleRow
                label="파트너 활동 알림"
                description="파트너가 할 일·일정을 추가·수정하면 알려드려요"
                checked={notifSettings.partner_enabled}
                onChange={(v) => saveNotif({ partner_enabled: v })}
                disabled={notifUpdating}
              />
            </div>

            {/* 내용 표시 */}
            <div className="px-5 py-4">
              <ToggleRow
                label="알림에 내용 표시"
                description="잠금화면에 일정·할 일 제목이 보여요"
                checked={notifSettings.show_content}
                onChange={(v) => saveNotif({ show_content: v })}
                disabled={notifUpdating}
              />
            </div>
          </div>
        )}
      </section>

      {/* 네이버 캘린더 연동 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-haru-border px-5 py-4">
          <Link2 className="h-4 w-4 text-haru-muted" />
          <h2 className="text-sm font-semibold text-haru-text">외부 캘린더 연동</h2>
        </div>
        <div className="px-5 py-4">
          {naverConnected === null ? (
            <p className="text-sm text-haru-muted">불러오는 중...</p>
          ) : naverConnected ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-haru-text">네이버 캘린더</p>
                <p className="mt-0.5 text-xs text-haru-muted">일정 추가 시 네이버 캘린더에 자동 등록돼요</p>
              </div>
              <button
                type="button"
                onClick={() => void handleNaverDisconnect()}
                disabled={naverLoading}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-haru-border px-3 py-2 text-xs font-medium text-haru-muted active:bg-haru-primary-soft disabled:opacity-40"
              >
                <Link2Off className="h-3.5 w-3.5" />
                연결 해제
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-haru-text">네이버 캘린더</p>
                <p className="mt-0.5 text-xs text-haru-muted">연결하면 하루투두 일정이 자동으로 등록돼요</p>
              </div>
              <button
                type="button"
                onClick={handleNaverConnect}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-haru-primary px-3 py-2 text-xs font-semibold text-haru-text active:bg-haru-primary-active"
              >
                <Link2 className="h-3.5 w-3.5" />
                연결하기
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 계정 — Settings 스타일 행 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex h-[52px] w-full items-center gap-3 px-5 transition-colors active:bg-haru-primary-soft disabled:opacity-40"
        >
          <LogOut className="h-4 w-4 shrink-0 text-haru-muted" />
          <span className="flex-1 text-left text-base text-haru-text">로그아웃</span>
          {isLoggingOut ? (
            <span className="text-sm text-haru-muted">처리 중...</span>
          ) : (
            <ChevronRight className="h-4 w-4 text-haru-muted" />
          )}
        </button>
      </section>

      {/* 위험 구역 — 커플 연결 해제 */}
      <section className="rounded-2xl border border-haru-danger/20 bg-haru-surface p-5 shadow-card">
        <div className="mb-4 flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-haru-danger" />
          <div>
            <p className="text-sm font-semibold text-haru-text">커플 연결 해제</p>
            <p className="mt-1 text-xs leading-relaxed text-haru-muted">
              연결 해제하면 공유된 할 일·일정·그룹이 모두 삭제되고 복구할 수 없어요.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDisconnectOpen(true)}
          className="min-h-[44px] w-full rounded-2xl bg-haru-danger/10 py-2.5 text-sm font-semibold text-haru-danger transition-colors active:bg-haru-danger/20"
        >
          커플 연결 해제하기
        </button>
      </section>

      {/* 아바타 색상 선택 */}
      <AvatarColorSheet
        open={colorSheetOpen}
        currentColor={getAvatarColor(me?.avatar_color)}
        partnerColor={getAvatarColor(partner?.avatar_color)}
        isSaving={isSavingColor}
        onSelect={handleColorSelect}
        onClose={() => setColorSheetOpen(false)}
      />

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

      {/* 다이얼로그: 커스텀 그룹 삭제 */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="그룹을 삭제할까요?"
        description="그룹에 속한 할 일은 '그 외'로 옮겨져요."
        confirmLabel="삭제"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteGroup}
        onClose={() => setPendingDelete(null)}
      />

      {/* 다이얼로그: 커플 연결 해제 */}
      <ConfirmDialog
        open={disconnectOpen}
        title="커플 연결을 해제할까요?"
        description={
          "⚠️ 연결 해제 시 공유된 할 일, 일정, 커스텀 그룹이 모두 삭제됩니다.\n\n" +
          "이 작업은 되돌릴 수 없으며, 파트너와 다시 연결하려면 새 초대 코드가 필요해요."
        }
        confirmLabel="연결 해제"
        cancelLabel="취소"
        variant="danger"
        isLoading={isDisconnecting}
        onConfirm={handleDisconnect}
        onClose={() => setDisconnectOpen(false)}
      />
    </div>
  );
}
