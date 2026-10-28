import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { Hud } from "./Hud";
import { HelpButton } from "./HelpDialog";
import { TerminalProvider } from "./terminal/TerminalProvider";
import { ErrorState, LoadingScreen } from "./States";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/queries";
import { getSettings } from "@/lib/settings";
import { setMusic } from "@/lib/sound";

/** Layout for every signed-in screen: auth guard, avatar onboarding, HUD, terminal, help. */
export function GameShell() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const me = useMe(Boolean(session));

  // Browsers only allow audio after a user gesture, so start music on the first click.
  useEffect(() => {
    const start = () => {
      if (getSettings().music) setMusic(true);
    };
    window.addEventListener("pointerdown", start, { once: true });
    return () => window.removeEventListener("pointerdown", start);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (me.isPending) return <LoadingScreen />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} fullScreen />;
  if (!me.data.avatar_chosen && location.pathname !== "/avatar") return <Navigate to="/avatar" replace />;

  return (
    <TerminalProvider username={me.data.username}>
      <Hud />
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24">
        <Outlet />
      </main>
      <HelpButton className="fixed right-4 bottom-4 z-30" />
    </TerminalProvider>
  );
}
