import { supabase } from "./supabase";

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const msg = (json as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
};

/* Response shapes ────────────────────────────────────────────────────────────
 * Field names stay snake_case to match the JSON exactly as the API sends it. */

export type Difficulty = "easy" | "medium" | "hard" | "extreme";
export type LabStatus = "completed" | "unlocked" | "locked";

export interface LevelInfo {
  level: number;
  xp: number;
  xp_into_level: number;
  xp_for_next: number;
}

export interface Me extends LevelInfo {
  id: string;
  email: string | null;
  is_anonymous: boolean;
  username: string;
  avatar_id: number;
  avatar_chosen: boolean;
  continue_journey: {
    storyline_slug: string;
    storyline_title: string;
    lab_slug: string;
    lab_title: string;
    labs_completed: number;
    labs_total: number;
  } | null;
}

export interface StorylineSummary {
  slug: string;
  title: string;
  theme: string | null;
  vibe: string | null;
  description: string | null;
  difficulty: Difficulty;
  available: boolean;
  reward: string | null;
  preview: string[];
  labs_total: number;
  labs_completed: number;
  next_lab_slug: string | null;
}

export interface LabSummary {
  slug: string;
  title: string;
  description: string | null;
  cipher_type: string;
  order_index: number;
  xp_reward: number;
  is_boss: boolean;
  skills: string[];
}

export interface StorylineDetail extends StorylineSummary {
  labs: (LabSummary & { status: LabStatus })[];
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface LabDetail extends LabSummary {
  story_segment: string | null;
  challenge_prompt: string | null;
  payload: {
    intro?: DialogueLine[];
    concept?: { title: string; body: string };
    files?: Record<string, string>;
    given?: Record<string, string>;
    tools?: string[];
  };
  status: LabStatus;
  storyline: { slug: string; title: string };
  lab_number: number;
  labs_total: number;
  hints: string[];
  hints_total: number;
  revealed: boolean;
  solution: string | null;
  attempts: number;
  xp_if_solved: number;
  next_lab: { slug: string; title: string } | null;
  outro: string | null;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export type SubmitResult =
  | { correct: false; attempts: number }
  | {
      correct: true;
      attempts: number;
      first_completion: boolean;
      xp_awarded: number;
      new_badges: BadgeInfo[];
      level: LevelInfo;
      next_lab: { slug: string; title: string } | null;
      outro: string | null;
    };

export interface Dashboard {
  profile: LevelInfo & { username: string; avatar_id: number; is_anonymous: boolean };
  stats: {
    labs_completed: number;
    labs_total: number;
    storylines_completed: number;
    total_attempts: number;
    incorrect_submissions: number;
    accuracy: number | null;
    avg_completion_ms: number | null;
    total_time_ms: number;
    hints_used: number;
    solutions_revealed: number;
  };
  badges: (BadgeInfo & { earned: boolean; earned_at: string | null })[];
  storylines: StorylineSummary[];
  completed_labs: {
    slug: string;
    title: string;
    storyline_title: string | null;
    completed_at: string;
    attempts: number;
    time_taken_ms: number | null;
    hints_used: number;
    revealed: boolean;
    xp_awarded: number;
  }[];
  skills: { skill: string; rank: string; completed: number; total: number }[];
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exit_code: number | null;
  timed_out: boolean;
}
