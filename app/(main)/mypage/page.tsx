"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X, Pencil, LogOut, ChevronRight, AlertTriangle } from "lucide-react";
import { signOut } from "@/lib/services/authService";
import { updateProfile } from "@/lib/services/profileService";
import { disconnectCouple } from "@/lib/services/coupleService";
import {
  MAX_CUSTOM_GROUPS_PER_COUPLE,
  ERR_GROUP_LIMIT_EXCEEDED,
} from "@/lib/services/customGroupService";
import { useCustomGroups } from "@/hooks/useCustomGroups";
import { useToastStore } from "@/store/useToastStore";
import { useCoupleStore } from "@/store/useCoupleStore";
import ConfirmDialog from "@/components/common/ConfirmDialog";
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

  const meInitial = me?.display_name?.charAt(0)?.toUpperCase() ?? "?";
  const partnerInitial = partner?.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-haru-text">마이페이지</h1>

      {/* 프로필 카드 */}
      <section className="rounded-3xl bg-haru-surface p-6 shadow-card">
        {/* 아바타 + 이름 */}
        <div className="flex items-start justify-center gap-6">
          {/* 나 */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-haru-primary-soft">
              <span className="text-2xl font-bold text-haru-text">{meInitial}</span>
            </div>
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-haru-accent-soft">
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
