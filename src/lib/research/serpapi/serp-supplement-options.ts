import { z } from "zod";

export const serpSupplementModeSchema = z.enum([
  "maps",
  "youtube",
  "jobs",
  "scholar",
  "app_store_search",
  "play_store_search",
  "forums",
]);

export const serpSupplementOptionsSchema = z.object({
  modes: z.array(serpSupplementModeSchema).optional(),
  localArea: z.string().optional(),
  jobQuery: z.string().optional(),
  appDiscoveryQuery: z.string().optional(),
  hl: z.string().optional(),
  gl: z.string().optional(),
});

export type SerpSupplementMode = z.infer<typeof serpSupplementModeSchema>;
export type SerpSupplementOptions = z.infer<typeof serpSupplementOptionsSchema>;
