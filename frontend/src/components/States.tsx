import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LoadingScreen({ label = "Decrypting…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
      <Loader2 className="size-6 animate-spin text-primary" />
      <span className="font-mono text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, fullScreen }: { error: unknown; onRetry?: () => void; fullScreen?: boolean }) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof TypeError
        ? "Can't reach the CipherCats server. Is the Flask API running?"
        : "Something went wrong.";
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 p-6 text-center", fullScreen ? "min-h-svh" : "min-h-[40vh]")} role="alert">
      <TriangleAlert className="size-8 text-destructive" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
