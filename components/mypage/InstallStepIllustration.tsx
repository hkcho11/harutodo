import Image from "next/image";
import { ArrowDownToLine, Ellipsis, MoreHorizontal, PlusSquare, Share, Smartphone } from "lucide-react";

export type InstallIllustrationKind = "safari-menu" | "share" | "more" | "menu" | "samsung" | "action" | "confirm";

type Props = {
  kind: InstallIllustrationKind;
  browser: "safari" | "chrome" | "samsung";
  label: string;
  detail: string;
};

/** Real app demo capture with illustrative browser controls, not an OS screenshot. */
export default function InstallStepIllustration({ kind, browser, label, detail }: Props) {
  const safari = browser === "safari";
  const menuOpen = kind === "share";
  const sheetOpen = kind === "more" || kind === "action" || kind === "confirm";
  const emphasis = "border-2 border-haru-text bg-haru-primary-soft text-haru-text";

  return (
    <figure className="overflow-hidden rounded-xl border border-haru-border bg-haru-surface-soft" aria-label={`${label}. ${detail}. 하루투두 데모 화면과 브라우저 메뉴를 조합한 안내 예시.`}>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden bg-haru-bg" aria-hidden="true">
        <Image src="/icons/install-guide-home.webp" alt="" fill sizes="(max-width: 420px) 80vw, 384px" className={`object-cover object-top ${sheetOpen || menuOpen ? "opacity-40" : ""}`} />
        {!safari && (
          <div className="absolute inset-x-0 top-0 flex h-11 items-center gap-2 border-b border-haru-border bg-haru-surface px-3 text-xs text-haru-text">
            <span className="flex-1 rounded-full bg-haru-surface-soft px-3 py-2">하루투두</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${emphasis}`}>
              {browser === "samsung" ? <ArrowDownToLine className="h-5 w-5" /> : <span className="text-xl">⋮</span>}
            </span>
          </div>
        )}
        {safari && (
          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center gap-2 border-t border-haru-border bg-haru-surface px-3 text-xs text-haru-text">
            <span className="flex-1 rounded-full bg-haru-surface-soft px-3 py-2 text-center">하루투두</span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${kind === "safari-menu" ? emphasis : "bg-haru-surface-soft"}`}><Ellipsis className="h-5 w-5" /></span>
          </div>
        )}
        {menuOpen && (
          <div className="absolute inset-x-3 bottom-14 rounded-2xl border border-haru-border bg-haru-surface p-3 shadow-card">
            <p className="mb-3 text-xs text-haru-muted">Safari 페이지 메뉴</p>
            <div className={`flex items-center gap-3 rounded-xl p-3 text-sm font-semibold ${emphasis}`}><Share className="h-5 w-5" />공유</div>
          </div>
        )}
        {sheetOpen && (
          <div className={`absolute inset-x-3 rounded-2xl border border-haru-border bg-haru-surface p-4 shadow-card ${safari ? "bottom-14" : "bottom-3"}`}>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-haru-text">
              <Image src="/icons/icon-192x192.png" width={32} height={32} alt="" className="rounded-lg" />
              <span>하루투두</span>
            </div>
            {kind === "more" ? (
              <>
                <p className="mb-3 text-xs text-haru-muted">공유 화면에서 더 많은 동작 보기</p>
                <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${emphasis}`}><MoreHorizontal className="h-5 w-5" />더보기</div>
              </>
            ) : kind === "confirm" ? (
              <>
                <p className="mb-3 text-xs text-haru-text">{safari ? "웹 앱으로 열기 · 켬" : "하루투두를 앱으로 설치"}</p>
                <div className={`rounded-xl p-3 text-center text-sm font-semibold ${emphasis}`}>{safari ? "추가" : "설치 / 추가"}</div>
              </>
            ) : (
              <>
                <p className="mb-3 text-xs text-haru-muted">{safari ? "공유 동작 목록" : "앱 설치 메뉴"}</p>
                <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${emphasis}`}>
                  {safari ? <PlusSquare className="h-5 w-5 shrink-0" /> : <Smartphone className="h-5 w-5 shrink-0" />}{label}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
