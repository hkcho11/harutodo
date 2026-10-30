"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import InstallStepIllustration, { type InstallIllustrationKind } from "./InstallStepIllustration";

type Browser = "safari" | "samsung";
type Step = {
  title: string;
  body: string;
  kind: InstallIllustrationKind;
  label: string;
  detail: string;
};

const guides: Record<Browser, { name: string; source: string; steps: Step[] }> = {
  safari: {
    name: "Safari",
    source: "https://support.apple.com/ko-kr/guide/iphone/iphea86e5236/ios",
    steps: [
      { title: "점 세 개 메뉴를 눌러요", body: "Safari에서 하루투두를 연 뒤, 주소창 옆 점 세 개(…)를 눌러주세요.", kind: "safari-menu", label: "점 세 개 메뉴", detail: "하루투두를 연 상태에서 … 누르기" },
      { title: "‘공유’를 선택해요", body: "열린 페이지 메뉴에서 위로 향한 화살표 모양의 ‘공유’를 눌러주세요.", kind: "share", label: "공유", detail: "페이지 메뉴 → 공유" },
      { title: "‘더보기’를 눌러요", body: "공유 화면에서 ‘더보기’를 눌러 전체 동작 목록을 펼쳐주세요.", kind: "more", label: "더보기", detail: "공유 화면 → 더보기" },
      { title: "‘홈 화면에 추가’를 선택해요", body: "동작 목록에서 ‘홈 화면에 추가’를 눌러주세요. 바로 보이지 않으면 목록을 아래로 내려보세요.", kind: "action", label: "홈 화면에 추가", detail: "동작 목록 → 홈 화면에 추가" },
      { title: "‘추가’를 누르면 준비 끝!", body: "‘웹 앱으로 열기’가 보이면 켜둔 채 ‘추가’를 눌러주세요. 아이폰 버전에 따라 이 옵션이 없을 수도 있어요.", kind: "confirm", label: "추가", detail: "웹 앱으로 열기 옵션이 있으면 켜기" },
    ],
  },
  samsung: {
    name: "삼성 인터넷",
    source: "https://developer.samsung.com/automation/progressive-web-app.html",
    steps: [
      { title: "삼성 인터넷에서 하루투두를 열어요", body: "주소창 주변에 앱 설치 아이콘(아래 화살표)이 있는지 확인하고 눌러주세요. 일부 버전에서는 + 모양으로 보여요.", kind: "samsung", label: "앱 설치 아이콘", detail: "주소창 주변의 ↓ 또는 + 확인" },
      { title: "설치 안내를 확인해요", body: "‘앱스 화면에 추가’ 또는 앱 설치 안내가 나타나면 추가·설치를 선택해주세요. 메뉴 이름은 버전에 따라 달라요.", kind: "action", label: "앱스 화면에 추가", detail: "추가 또는 설치를 선택해요" },
      { title: "새 아이콘으로 열어보세요", body: "앱스 화면에 생긴 하루투두 아이콘을 홈 화면으로 옮겨 사용할 수 있어요. 설치 메뉴가 보이지 않으면 아래 공식 안내를 확인해주세요.", kind: "confirm", label: "하루투두 설치 완료", detail: "앱스 화면의 새 아이콘을 찾아요" },
    ],
  },
};

function GuideSteps({ browser }: { browser: Browser }) {
  return (
    <ol className="flex flex-col gap-4">
      {guides[browser].steps.map((step, index) => (
        <li key={step.kind} className="flex flex-col gap-3 rounded-2xl bg-haru-surface p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-haru-text">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-haru-primary-soft text-xs">{index + 1}</span>
            <span><span className="sr-only">{index + 1}단계. </span>{step.title}</span>
          </h2>
          <p className="text-sm leading-relaxed text-haru-text">{step.body}</p>
          <InstallStepIllustration browser={browser} kind={step.kind} label={step.label} detail={step.detail} />
        </li>
      ))}
    </ol>
  );
}

export default function InstallGuide() {
  const [browser, setBrowser] = useState<Browser>("safari");
  const guide = guides[browser];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-haru-muted">홈 화면에 담아두고, 아이콘 한 번으로 열어보세요.</p>
      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-semibold text-haru-text">사용하는 휴대폰을 골라주세요</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["safari", "아이폰", "Safari"],
            ["samsung", "갤럭시", "삼성 인터넷"],
          ] as const).map(([value, device, name]) => (
            <label key={value} className="relative cursor-pointer">
              <input type="radio" name="install-browser" value={value} checked={browser === value} onChange={() => setBrowser(value)} className="peer sr-only" />
              <span className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-haru-border bg-haru-surface px-2 py-3 text-haru-text peer-checked:border-haru-text peer-checked:bg-haru-primary-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-haru-text">
                <span className="text-sm font-semibold">{device}</span>
                <span className="text-xs">{name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <section aria-label={`${guide.name} 설치 안내`} className="flex flex-col gap-2">
        <p className="text-xs text-haru-muted">{guide.name}에서 하루투두를 열고 따라 해보세요.</p>
        <GuideSteps key={browser} browser={browser} />
        <p className="text-xs leading-relaxed text-haru-muted">하루투두 화면에 메뉴를 조합한 예시예요. 실제 모양과 위치는 다를 수 있어요.</p>
      </section>
      <details className="text-sm text-haru-text">
        <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-haru-text">화면이 다르거나, 설치가 잘 안 되나요?</summary>
        <div className="flex flex-col gap-3 pb-2 text-sm leading-relaxed text-haru-muted">
          <p>카카오톡 같은 앱 안에서 열었다면 {guide.name}에서 하루투두를 다시 열어주세요.</p>
          {browser === "safari" && <p>공유 버튼이 바로 보이면 공유부터, ‘더보기’ 없이 동작 목록이 보이면 ‘홈 화면에 추가’부터 따라 해주세요.</p>}
          <p>설치한 아이콘으로 열었는데도 주소창이 보인다면 사이트 바로가기일 수 있어요. 위 안내에 따라 설치했는지 확인해주세요.</p>
        </div>
      </details>
      <a href={guide.source} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1 text-xs text-haru-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-haru-text">{guide.name} 공식 안내<ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
    </div>
  );
}
