"use client";

interface HopeAvatarProps {
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

const sizeClasses: Record<NonNullable<HopeAvatarProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function HopeAvatar({ size = "md", active = false }: HopeAvatarProps) {
  const baseSize = sizeClasses[size];

  return (
    <div
      className={`relative overflow-hidden rounded-full ${baseSize} ${
        active ? "shadow-[0_0_0_1px_rgba(255,255,255,0.12)]" : ""
      }`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,#f5f3ff,transparent_60%),radial-gradient(circle_at_80%_20%,#c4b5fd,transparent_55%),radial-gradient(circle_at_20%_80%,#f9a8d4,transparent_55%),radial-gradient(circle_at_90%_90%,#a5f3fc,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),transparent_60%)] mix-blend-screen" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(15,23,42,0.45),transparent_70%)] opacity-70" />
      <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_0_0,rgba(15,23,42,0.6),transparent_55%),radial-gradient(circle_at_100%_0,rgba(15,23,42,0.4),transparent_55%)]" />
    </div>
  );
}

