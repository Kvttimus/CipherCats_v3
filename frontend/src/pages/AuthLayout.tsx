import { CatAvatar } from "@/components/CatAvatar";
import { HelpButton } from "@/components/HelpDialog";
import { supabaseConfigured } from "@/lib/supabase";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center p-4">
      <div className="panel w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <CatAvatar handler className="size-16 animate-float" />
          <h1 className="text-3xl font-bold tracking-wider text-primary glow-text">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {!supabaseConfigured && (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive" role="alert">
            Supabase isn't configured. Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and add your project URL and anon key.
          </p>
        )}
        {children}
      </div>
      <HelpButton className="fixed right-4 bottom-4" />
    </main>
  );
}
