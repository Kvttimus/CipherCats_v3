import { useState } from "react";
import { useLocation } from "react-router";
import { CircleHelp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_HELP: { match: RegExp; title: string; body: string[] }[] = [
  {
    match: /^\/login|^\/signup/,
    title: "Getting in",
    body: [
      "Create an account to keep your progress on any device, or continue as a guest to jump straight in.",
      "Guest progress is tied to this browser. You can create an account later.",
    ],
  },
  {
    match: /^\/labs\//,
    title: "How labs work",
    body: [
      "Read the briefing, then open the terminal (Ctrl + ` or the button) to work on the ciphertext.",
      "Lab files are loaded into the terminal: `ls` lists them, `cat file` prints one, and `$FILE` passes it to any command.",
      "Hints cost 15% of the lab's XP each, down to a minimum of 50%. Revealing the solution completes the lab for 0 XP.",
      "Submit your answer in the answer box or with `submit <answer>` in the terminal. Capitalisation and punctuation don't matter.",
    ],
  },
  {
    match: /^\/storylines\//,
    title: "The storyline map",
    body: [
      "Labs unlock one at a time. Clear a lab to open the next. The final lab is a boss that combines everything you've learned.",
      "Storylines don't depend on each other, so you can switch to any available storyline from the menu at any time.",
    ],
  },
  {
    match: /^\/dashboard/,
    title: "Your dossier",
    body: ["Track XP, levels, badges, skills and every lab you've completed. Stats come from your submissions, so your mistakes count too."],
  },
  {
    match: /^\/menu/,
    title: "Choosing a storyline",
    body: ["Each storyline is a campaign built around one area of cryptography. Pick one to see its briefing and reward."],
  },
];

const GENERAL = [
  "CipherCats teaches cryptography through story-driven labs. Each lab introduces one technique, and each storyline ends in a boss lab.",
  "Earn XP to level up, collect badges, and raise your skill ranks from Beginner to Expert.",
];

export function HelpButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const page = PAGE_HELP.find((p) => p.match.test(pathname));

  return (
    <>
      <Button
        variant="outline"
        size="icon-lg"
        onClick={() => setOpen(true)}
        className={cn("rounded-full bg-card/80 backdrop-blur", className)}
        aria-label="Help"
      >
        <CircleHelp />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">{page?.title ?? "How to play"}</DialogTitle>
            <DialogDescription>CipherCats field manual</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-foreground/85">
            {(page?.body ?? GENERAL).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-primary">▸</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Shortcuts</p>
            <p>Ctrl + ` toggles the terminal · Esc closes it · ↑/↓ for command history · Tab completes commands</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
