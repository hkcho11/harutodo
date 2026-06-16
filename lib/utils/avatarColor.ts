export type AvatarColor = "green" | "sky" | "mint" | "lavender" | "blush";

export const AVATAR_COLOR_KEYS: AvatarColor[] = [
  "green",
  "sky",
  "mint",
  "lavender",
  "blush",
];

interface AvatarColorTokens {
  label: string;
  hex: string;
  avatarBg: string;   // 아바타 원형 배경
  barBg: string;      // EventList 왼쪽 바 (단색)
  barBgSoft: string;  // MonthCalendar 이벤트 바 (반투명)
  columnBg: string;   // IndividualSection 컬럼 배경
}

export const AVATAR_COLOR_CLASSES: Record<AvatarColor, AvatarColorTokens> = {
  green: {
    label: "연두",
    hex: "#B9DFA7",
    avatarBg: "bg-haru-primary-soft",
    barBg: "bg-haru-primary-active",
    barBgSoft: "bg-haru-primary-active/15",
    columnBg: "bg-haru-primary-soft",
  },
  sky: {
    label: "스카이",
    hex: "#B8DCE8",
    avatarBg: "bg-haru-accent-soft",
    barBg: "bg-haru-accent",
    barBgSoft: "bg-haru-accent/15",
    columnBg: "bg-haru-accent-soft",
  },
  mint: {
    label: "민트",
    hex: "#B5E8D5",
    avatarBg: "bg-haru-avatar-mint-soft",
    barBg: "bg-haru-avatar-mint",
    barBgSoft: "bg-haru-avatar-mint/15",
    columnBg: "bg-haru-avatar-mint-soft",
  },
  lavender: {
    label: "라벤더",
    hex: "#C9C5F0",
    avatarBg: "bg-haru-avatar-lavender-soft",
    barBg: "bg-haru-avatar-lavender",
    barBgSoft: "bg-haru-avatar-lavender/15",
    columnBg: "bg-haru-avatar-lavender-soft",
  },
  blush: {
    label: "블러쉬",
    hex: "#F0C5D4",
    avatarBg: "bg-haru-avatar-blush-soft",
    barBg: "bg-haru-avatar-blush",
    barBgSoft: "bg-haru-avatar-blush/15",
    columnBg: "bg-haru-avatar-blush-soft",
  },
};

export function getAvatarColor(color: string | null | undefined): AvatarColor {
  if (color && (AVATAR_COLOR_KEYS as string[]).includes(color))
    return color as AvatarColor;
  return "green";
}
