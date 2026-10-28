import { Link } from "react-router";
import { LogOut, Music, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button, buttonVariants } from "@/components/ui/button";
import { updateSettings, useSettings } from "@/lib/settings";
import { play, setMusic } from "@/lib/sound";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/queries";
import { cn } from "@/lib/utils";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const settings = useSettings();
  const { signOut } = useAuth();
  const { data: me } = useMe();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-primary">Settings</DialogTitle>
          <DialogDescription>
            {me ? `Signed in as ${me.username}${me.is_anonymous ? " (guest)" : ""}` : "Preferences are saved on this browser."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Row icon={<Volume2 className="size-4" />} label="Sound effects" htmlFor="sfx">
            <Switch
              id="sfx"
              checked={settings.sound}
              onCheckedChange={(v) => {
                updateSettings({ sound: v });
                if (v) play("click");
              }}
            />
          </Row>
          <Row icon={<Music className="size-4" />} label="Ambient music" htmlFor="music">
            <Switch
              id="music"
              checked={settings.music}
              onCheckedChange={(v) => {
                updateSettings({ music: v });
                setMusic(v);
              }}
            />
          </Row>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Link to="/avatar" onClick={() => onOpenChange(false)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Change avatar
          </Link>
          {me?.is_anonymous && (
            <Link to="/signup" onClick={() => onOpenChange(false)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Create account
            </Link>
          )}
          <Button variant="destructive" size="sm" className="ml-auto" onClick={() => void signOut()}>
            <LogOut /> Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, label, htmlFor, children }: { icon: React.ReactNode; label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-2">
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}
