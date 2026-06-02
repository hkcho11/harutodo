"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X } from "lucide-react";
import { signOut } from "@/lib/services/authService";
import {
  MAX_CUSTOM_GROUPS_PER_COUPLE,
  ERR_GROUP_LIMIT_EXCEEDED,
} from "@/lib/services/customGroupService";
import { useCustomGroups } from "@/hooks/useCustomGroups";
import { useToastStore } from "@/store/useToastStore";
import { useCoupleStore } from "@/store/useCoupleStore";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import type { CustomGroup } from "@/types/todo";

export default function MyPage() {
  const router = useRouter();
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);
  const { groups, loading, error, refetch, add, remove } = useCustomGroups();
  const showToast = useToastStore((s) => s.show);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 그룹 생성 UI
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  // 그룹 삭제 확인
  const [pendingDelete, setPendingDelete] = useState<CustomGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-haru-text">마이페이지</h1>

      {/* 프로필 카드 */}
      <section className="rounded-2xl bg-haru-surface p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-haru-text">프로필</h2>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-haru-muted">나</span>
            <span className="text-haru-text">{me?.display_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-haru-muted">파트너</span>
            <span className="text-haru-text">
              {partner?.display_name ?? "—"}
            </span>
          </div>
        </div>
      </section>

      {/* 커스텀 그룹 카드 */}
      <section className="rounded-2xl bg-haru-surface p-5 shadow-card">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-haru-text">
            커스텀 그룹
          </h2>
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
            <p className="text-sm text-haru-danger">
              그룹을 불러오지 못했어요
            </p>
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
                <span className="truncate text-sm text-haru-text">
                  {g.name}
                </span>
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

      {/* 로그아웃 */}
      <section className="rounded-2xl bg-haru-surface p-5 shadow-card">
        <Button variant="ghost" onClick={handleLogout} isLoading={isLoggingOut}>
          로그아웃
        </Button>
      </section>

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
    </div>
  );
}
