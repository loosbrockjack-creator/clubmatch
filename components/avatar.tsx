import Image from "next/image";

/**
 * Preset avatars stay inside the site palette: cardinal, gold, and neutrals.
 * Index is stored in profiles.avatar_preset.
 */
export const AVATAR_PRESETS = [
  { bg: "bg-cardinal", fg: "text-white" },
  { bg: "bg-gold", fg: "text-ink" },
  { bg: "bg-ink", fg: "text-white" },
  { bg: "bg-cardinal-tint", fg: "text-cardinal" },
  { bg: "bg-gold-tint", fg: "text-gold-deep" },
  { bg: "bg-muted-deep", fg: "text-ink" },
] as const;

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  url,
  preset,
  size = 40,
  className = "",
}: {
  name: string | null | undefined;
  url?: string | null;
  preset?: number | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full object-cover ring-1 ring-line ${className}`}
      />
    );
  }
  const tone = AVATAR_PRESETS[(preset ?? 0) % AVATAR_PRESETS.length];
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-[0.02em] ${tone.bg} ${tone.fg} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
