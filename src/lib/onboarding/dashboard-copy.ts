/** Shared onboarding strings so dashboard, setup, and tour stay aligned. */

export const ONBOARDING_SETUP_TOTAL = 3;

export function setupStepLabel(completedCount: number): string {
  const n = Math.min(completedCount + 1, ONBOARDING_SETUP_TOTAL);
  return `Setup · step ${n} of ${ONBOARDING_SETUP_TOTAL}`;
}

export const ONBOARDING_FULL_LOOP_LEDE =
  "Three steps get you to your first interviews; insights unlock after sessions finish.";
