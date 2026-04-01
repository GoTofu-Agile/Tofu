import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";
import * as lorelei from "@dicebear/lorelei";

/**
 * Deterministic face avatars with lightweight demographic + profession matching:
 * - gender selects style family (female -> lorelei, male -> adventurer)
 * - unknown/legacy gender falls back to a human sketch style (adventurer)
 * - occupation biases background palette for a subtle profession cue
 * Seed uses stable persona id so the image does not change when display name edits.
 */
export function getPersonaAvatarDataUri(params: {
  personaId: string;
  pixelSize: number;
  gender?: string | null;
  occupation?: string | null;
}): string {
  const { personaId, pixelSize, gender, occupation } = params;
  const backgroundColor = pickBackgroundForOccupation(occupation);
  const g = (gender ?? "").toLowerCase();

  if (g.includes("female") || g === "f" || g.includes("woman")) {
    return createAvatar(lorelei, {
      seed: personaId,
      size: pixelSize,
      radius: 22,
      backgroundColor,
    }).toDataUri();
  }

  return createAvatar(adventurer, {
    seed: personaId,
    size: pixelSize,
    radius: 22,
    backgroundColor,
  }).toDataUri();
}

function pickBackgroundForOccupation(occupation: string | null | undefined): string[] {
  const text = (occupation ?? "").toLowerCase();
  if (/teacher|professor|educat|school|library|tutor/.test(text)) return ["c7d2fe", "bfdbfe"];
  if (/doctor|nurse|medical|clinic|health|care/.test(text)) return ["bae6fd", "bbf7d0"];
  if (/engineer|developer|software|data|product|it|tech/.test(text)) return ["ddd6fe", "e9d5ff"];
  if (/designer|artist|creative|writer|journalist/.test(text)) return ["fecaca", "fde68a"];
  if (/finance|bank|account|invest|consult|director|manager|executive/.test(text)) {
    return ["d1fae5", "a7f3d0"];
  }
  return ["e2e8f0", "dbeafe"];
}
