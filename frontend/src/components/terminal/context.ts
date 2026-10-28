import { createContext, useContext } from "react";

export interface LabShellContext {
  files: Record<string, string>;
  submit?: (answer: string) => Promise<string>;
}

export interface TerminalApi {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Load the current lab's files + submit handler into the shell (null to clear). */
  setLabContext: (ctx: LabShellContext | null) => void;
  /** Open the terminal with `text` typed at the prompt. */
  typeCommand: (text: string) => void;
}

export const TerminalCtx = createContext<TerminalApi | null>(null);

export function useTerminal() {
  const v = useContext(TerminalCtx);
  if (!v) throw new Error("useTerminal must be used inside <TerminalProvider>");
  return v;
}
