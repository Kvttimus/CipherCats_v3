import {
  Award,
  BarChart3,
  Crown,
  EyeOff,
  Gem,
  Layers,
  Repeat,
  RotateCw,
  ScrollText,
  Sigma,
  Sparkles,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "rotate-cw": RotateCw,
  layers: Layers,
  sigma: Sigma,
  "bar-chart-3": BarChart3,
  crown: Crown,
  "scroll-text": ScrollText,
  target: Target,
  "eye-off": EyeOff,
  timer: Timer,
  repeat: Repeat,
  gem: Gem,
};

export function BadgeIcon({ icon, earned = true, className }: { icon: string; earned?: boolean; className?: string }) {
  const Icon = ICONS[icon] ?? Award;
  return (
    <span
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full border-2",
        earned
          ? "border-primary/70 bg-gradient-to-br from-primary/30 to-primary/5 text-primary shadow-[0_0_18px] shadow-primary/25"
          : "border-dashed border-border bg-muted/30 text-muted-foreground/50",
        className,
      )}
      aria-hidden
    >
      <Icon className="size-1/2" />
    </span>
  );
}
