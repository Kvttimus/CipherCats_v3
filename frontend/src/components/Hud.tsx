import { useState } from "react";
import { Link, NavLink } from "react-router";
import { Home, LayoutDashboard, Map, Settings, SquareTerminal } from "lucide-react";
import { CatAvatar } from "./CatAvatar";
import { SettingsDialog } from "./SettingsDialog";
import { useTerminal } from "./terminal/context";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/queries";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/menu", label: "Storylines", icon: Map, end: false },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: false },
];

/** Persistent game HUD: who you are, your level/XP bar, and navigation. */
export function Hud() {
  const { data: me } = useMe();
  const terminal = useTerminal();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pct = me ? (me.xp_into_level / me.xp_for_next) * 100 : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/75 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="mr-1 shrink-0 font-bold tracking-wider text-primary glow-text">
          CipherCats
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors",
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="size-4" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {me && (
            <Link to="/dashboard" className="flex items-center gap-2" aria-label={`${me.username}, level ${me.level}`}>
              <CatAvatar avatarId={me.avatar_id} className="size-8" />
              <div className="hidden w-36 sm:block">
                <div className="flex justify-between text-[11px] leading-tight">
                  <span className="truncate font-medium">{me.username}</span>
                  <span className="text-primary">LV {me.level}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" title={`${me.xp_into_level} / ${me.xp_for_next} XP`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Link>
          )}
          <Button
            variant={terminal.open ? "default" : "outline"}
            size="sm"
            onClick={terminal.toggle}
            aria-pressed={terminal.open}
            aria-label="Toggle terminal"
          >
            <SquareTerminal />
            <span className="hidden lg:inline">Terminal</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <Settings />
          </Button>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
