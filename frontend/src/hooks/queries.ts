import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Dashboard, type LabDetail, type Me, type StorylineDetail, type StorylineSummary } from "@/lib/api";

export const keys = {
  me: ["me"] as const,
  storylines: ["storylines"] as const,
  storyline: (slug: string) => ["storyline", slug] as const,
  lab: (slug: string) => ["lab", slug] as const,
  dashboard: ["dashboard"] as const,
};

export const useMe = (enabled = true) => useQuery({ queryKey: keys.me, queryFn: () => api.get<Me>("/me"), enabled });

export const useStorylines = () =>
  useQuery({ queryKey: keys.storylines, queryFn: () => api.get<StorylineSummary[]>("/storylines") });

export const useStoryline = (slug: string) =>
  useQuery({ queryKey: keys.storyline(slug), queryFn: () => api.get<StorylineDetail>(`/storylines/${slug}`) });

export const useLab = (slug: string) =>
  useQuery({ queryKey: keys.lab(slug), queryFn: () => api.get<LabDetail>(`/labs/${slug}`), retry: false });

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<Dashboard>("/dashboard") });

export function useSetAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (avatar_id: number) => api.patch("/me", { avatar_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

/** After a lab is solved, everything that shows progress is stale. */
export function useInvalidateProgress() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.me }),
      qc.invalidateQueries({ queryKey: keys.storylines }),
      qc.invalidateQueries({ queryKey: ["storyline"] }),
      qc.invalidateQueries({ queryKey: keys.dashboard }),
    ]);
}
