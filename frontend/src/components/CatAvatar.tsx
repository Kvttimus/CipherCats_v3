import { AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

const HANDLER = { fur: "#f59e0b", stripe: "#c2700a", scarf: "#18181b" };

interface Props {
  avatarId?: number;
  /** Agent Marmalade, the player's handler. */
  handler?: boolean;
  className?: string;
  title?: string;
}

export function CatAvatar({ avatarId = 0, handler, className, title }: Props) {
  const avatar = AVATARS[avatarId] ?? AVATARS[0];
  const c = handler ? HANDLER : avatar;
  const label = title ?? (handler ? "Agent Marmalade" : `${avatar.name} cat`);
  return (
    <svg viewBox="0 0 100 100" className={cn("size-12", className)} role="img" aria-label={label}>
      {/* ears */}
      <path d="M18 44 L24 10 L44 30 Z" fill={c.fur} />
      <path d="M82 44 L76 10 L56 30 Z" fill={c.fur} />
      <path d="M24 34 L27 18 L37 28 Z" fill="#fda4af" opacity="0.7" />
      <path d="M76 34 L73 18 L63 28 Z" fill="#fda4af" opacity="0.7" />
      {/* head */}
      <ellipse cx="50" cy="54" rx="34" ry="30" fill={c.fur} />
      <path d="M44 26 Q50 34 56 26" stroke={c.stripe} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M50 26 L50 36" stroke={c.stripe} strokeWidth="4" strokeLinecap="round" />
      {/* eyes */}
      <ellipse cx="37" cy="52" rx="6" ry="7" fill="#18181b" />
      <ellipse cx="63" cy="52" rx="6" ry="7" fill="#18181b" />
      <circle cx="39" cy="49.5" r="2" fill="#fff" />
      <circle cx="65" cy="49.5" r="2" fill="#fff" />
      {handler && (
        <>
          {/* monocle */}
          <circle cx="63" cy="52" r="10" fill="none" stroke="#fcd34d" strokeWidth="2.5" />
          <path d="M72 58 Q78 70 74 82" stroke="#fcd34d" strokeWidth="1.5" fill="none" />
        </>
      )}
      {/* nose + mouth */}
      <path d="M46 62 L54 62 L50 67 Z" fill="#fb7185" />
      <path d="M50 67 Q46 72 42 70 M50 67 Q54 72 58 70" stroke="#18181b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* whiskers */}
      <g stroke="#18181b" strokeWidth="1.2" opacity="0.55" strokeLinecap="round">
        <path d="M30 64 L12 60 M30 68 L12 70" />
        <path d="M70 64 L88 60 M70 68 L88 70" />
      </g>
      {/* scarf / collar */}
      <path d="M22 80 Q50 94 78 80 L76 88 Q50 100 24 88 Z" fill={c.scarf} />
      {handler ? (
        <circle cx="50" cy="92" r="4" fill="#fcd34d" />
      ) : (
        <path d="M60 88 L66 99 L56 97 Z" fill={c.scarf} />
      )}
    </svg>
  );
}
