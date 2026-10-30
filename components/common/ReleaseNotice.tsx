"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import { useCoupleStore } from "@/store/useCoupleStore";
import { acknowledgeRelease, shouldShowRelease } from "@/lib/utils/releaseNotice";
import release from "@/lib/content/releaseNotes.json";

const acknowledgedInSession = new Set<string>();
const changedEvent = "harutodo-release-acknowledged";

function subscribe(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener(changedEvent, update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener(changedEvent, update);
  };
}

function getSnapshot() {
  if (acknowledgedInSession.has(release.version)) return false;
  try { return shouldShowRelease(window.localStorage, release.version); } catch { return true; }
}

export default function ReleaseNotice() {
  const me = useCoupleStore((state) => state.me);
  const unseen = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const dialog = useRef<HTMLDialogElement>(null);
  const open = Boolean(me) && unseen;

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  const confirm = () => {
    acknowledgedInSession.add(release.version);
    try { acknowledgeRelease(window.localStorage, release.version); } catch { /* Current session still dismisses. */ }
    window.dispatchEvent(new Event(changedEvent));
  };

  return (
    <dialog ref={dialog} aria-labelledby="release-title" aria-describedby="release-items" onCancel={(event) => event.preventDefault()} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-3xl border-0 bg-haru-surface p-6 text-haru-text shadow-card backdrop:bg-haru-text/40">
      <Sparkles className="mb-3 h-6 w-6" aria-hidden="true" />
      <p className="mb-1 text-xs text-haru-muted">하루투두 v{release.version}</p>
      <h2 id="release-title" className="text-lg font-bold">우리의 하루가 조금 더 편해졌어요</h2>
      <p className="mt-4 text-sm leading-relaxed text-haru-text">{release.intro}</p>
      <ul id="release-items" className="my-5 list-disc space-y-3 pl-5 text-sm leading-relaxed">
        {release.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="mb-5 text-sm leading-relaxed text-haru-text">{release.closing}</p>
      <Button onClick={confirm} autoFocus>확인했어요</Button>
    </dialog>
  );
}
