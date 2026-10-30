"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X, Pencil, LogOut, ChevronRight, AlertTriangle, Bell, Link2, Download, Smartphone } from "lucide-react";
import AvatarColorSheet from "@/components/mypage/AvatarColorSheet";
import AppVersion from "@/components/mypage/AppVersion";
import FeedbackLinks from "@/components/feedback/FeedbackLinks";
import { signOut } from "@/lib/services/authService";
import { updateProfile } from "@/lib/services/profileService";
import { disconnectCouple } from "@/lib/services/coupleService";
import { getAvatarColor, AVATAR_COLOR_CLASSES, type AvatarColor } from "@/lib/utils/avatarColor";
import {
  MAX_CUSTOM_GROUPS_PER_COUPLE,
  ERR_GROUP_LIMIT_EXCEEDED,
} from "@/lib/services/customGroupService";
import { useCustomGroups } from "@/hooks/useCustomGroups";
import { useToastStore } from "@/store/useToastStore";
import { useCoupleStore } from "@/store/useCoupleStore";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import LoadingScreen from "@/components/common/LoadingScreen";
import { cn } from "@/lib/utils/cn";
import { useAppRefresh } from "@/components/layout/PullToRefresh";
import type { CustomGroup } from "@/types/todo";

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
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      showToast("로그아웃에 실패했어요. 다시 시도해주세요");
      setIsLoggingOut(false);
      setLogoutOpen(false);
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

  useAppRefresh(refetch);

  // 위젯 스크립트 프리패치 — 버튼 클릭 시 await 없이 즉시 복사해 유저 제스처 유실 방지
  const [widgetScript, setWidgetScript] = useState<string | null>(null);
  useEffect(() => {
    fetch("/scriptable/harutodo-widget.js")
      .then((r) => r.text())
      .then(setWidgetScript)
      .catch(() => {});
  }, []);

  const handleInstallWidget = async () => {
    try {
      const code =
        widgetScript ??
        (await (await fetch("/scriptable/harutodo-widget.js")).text());

      // HTTP 로컬 등 보안 컨텍스트 아닌 환경은 execCommand 폴백
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const el = document.createElement("textarea");
        el.value = code;
        el.style.cssText = "position:fixed;left:-9999px;top:-9999px";
        document.body.appendChild(el);
        el.focus();
        el.setSelectionRange(0, el.value.length);
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        if (!ok) throw new Error("copy failed");
      }

      // 앱 미설치 시 앱스토어로 폴백 (1.5초 후)
      const fallback = setTimeout(() => {
        window.location.href = "https://apps.apple.com/app/scriptable/id1405459188";
      }, 1500);

      // 앱이 열려 페이지가 백그라운드로 전환되면 폴백 취소
      const cancel = () => {
        if (document.hidden) clearTimeout(fallback);
        document.removeEventListener("visibilitychange", cancel);
      };
      document.addEventListener("visibilitychange", cancel);

      window.location.href = "scriptable:///";
    } catch {
      showToast("복사에 실패했어요. 다시 시도해주세요");
    }
  };

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
        <Link
          href="/mypage/notifications"
          className="flex min-h-14 items-center gap-3 px-5 py-4 active:bg-haru-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary"
        >
          <Bell className="h-4 w-4 shrink-0 text-haru-muted" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-haru-text">알림 설정</h2>
            <p className="mt-0.5 text-xs text-haru-muted">알림 종류와 받는 시간을 관리해요</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-haru-muted" />
        </Link>
      </section>

      {/* 의견 및 문의 */}
      <Link href="/mypage/install" className="flex min-h-14 items-center gap-3 rounded-2xl bg-haru-surface px-5 py-4 shadow-card active:bg-haru-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary">
        <Smartphone className="h-5 w-5 shrink-0 text-haru-muted" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-haru-text">홈 화면에 추가하기</h2>
          <p className="mt-1 text-xs text-haru-muted">아이폰·안드로이드에서 앱처럼 사용해요</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-haru-muted" aria-hidden="true" />
      </Link>

      <FeedbackLinks />

      {/* 연동 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-haru-border px-5 py-4">
          <Link2 className="h-4 w-4 text-haru-muted" />
          <h2 className="text-sm font-semibold text-haru-text">연동</h2>
        </div>
        <div className="divide-y divide-haru-border">
          {/* 홈 화면 위젯 */}
          <div className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold text-haru-muted">홈 화면 위젯</p>
            <p className="mb-3 text-xs leading-relaxed text-haru-muted">
              Scriptable 앱으로 홈 화면에 월간 캘린더 위젯을 추가할 수 있어요. 버튼을 누르면 스크립트가 복사되고 Scriptable이 열려요. 새 스크립트를 만들어 붙여넣기 후 실행하면 돼요.
            </p>
            <button
              type="button"
              onClick={() => void handleInstallWidget()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-haru-primary py-3 text-sm font-semibold text-haru-text active:bg-haru-primary-active"
            >
              <Download className="h-4 w-4" />
              복사하고 Scriptable 열기
            </button>
            <p className="mt-2 text-center text-xs text-haru-muted">
              Scriptable이 설치돼 있어야 해요 (App Store 무료)
            </p>
          </div>
        </div>
      </section>

      {/* 계정 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
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
        <button
          type="button"
          onClick={() => setDisconnectOpen(true)}
          className="flex w-full items-center gap-3 border-t border-haru-border px-5 py-4 transition-colors active:bg-haru-danger/5"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-haru-danger" />
          <div className="flex-1 text-left">
            <p className="text-base text-haru-danger">커플 연결 해제</p>
            <p className="mt-0.5 text-xs text-haru-muted">해제 시 공유 데이터가 모두 삭제돼요</p>
          </div>
          <ChevronRight className="h-4 w-4 text-haru-danger" />
        </button>
      </section>

      <AppVersion />

      {/* 아바타 색상 선택 */}
      <AvatarColorSheet
        open={colorSheetOpen}
        currentColor={getAvatarColor(me?.avatar_color)}
        partnerColor={getAvatarColor(partner?.avatar_color)}
        isSaving={isSavingColor}
        onSelect={handleColorSelect}
        onClose={() => setColorSheetOpen(false)}
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

      {/* 다이얼로그: 로그아웃 */}
      <ConfirmDialog
        open={logoutOpen}
        title="로그아웃할까요?"
        description="로그아웃하면 다시 로그인해야 해요."
        confirmLabel="로그아웃"
        cancelLabel="취소"
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onClose={() => setLogoutOpen(false)}
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
