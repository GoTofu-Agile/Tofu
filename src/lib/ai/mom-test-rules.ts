/**
 * Mom Test rules for evaluating interview question quality.
 * Based on Rob Fitzpatrick's "The Mom Test":
 * 1. Talk about their life, not your idea
 * 2. Ask about specifics in the past, not generics about the future
 * 3. Talk less, listen more
 */

export const MOM_TEST_ISSUES = {
  hypothetical: "Hypothetical question — people can't reliably predict future behavior.",
  opinion: "Asks for opinion instead of behavior. Opinions are unreliable data.",
  leading: "Leading question that suggests a desired answer.",
  yes_no: "Yes/no question that doesn't explore behavior or motivations.",
  compliment_seeking: "May invite compliments rather than honest feedback.",
  too_generic: "Too generic — anchor to a specific past event for better insights.",
  future_focused: "Future-focused. Ask about what they've already done instead.",
} as const;

export type MomTestIssue = keyof typeof MOM_TEST_ISSUES;

export const EVALUATION_PROMPT = `You are a senior UX researcher and expert on Rob Fitzpatrick's "The Mom Test".
Evaluate each interview question against these principles:

## The Mom Test Rules
1. Talk about THEIR LIFE, not your idea — don't pitch, explore their reality
2. Ask about SPECIFICS IN THE PAST, not generics or opinions about the future
3. Talk less, listen more — open-ended questions that let them tell stories

## Red Flags to Detect
- "Would you...?" / "Will you...?" → hypothetical (people can't predict behavior)
- "Do you think...?" / "Do you like...?" → opinion (unreliable data)
- "Don't you agree...?" / "Isn't it true...?" → leading (suggests the answer)
- Questions answerable with just "yes" or "no" → yes_no (no insight)
- "How much would you pay?" → hypothetical (anchoring bias)
- "Would you use a product that...?" → compliment_seeking + hypothetical
- "How often do you...?" without past anchor → too_generic
- "Will you...?" / "Are you going to...?" → future_focused

## Green Flags (Good Questions)
- "Tell me about the last time you..."
- "What happened when you...?"
- "Walk me through how you currently..."
- "Why did you bother doing that?"
- "What are the implications of that?"
- "How are you dealing with that today?"
- "What else have you tried?"
- "What was the hardest part about...?"

For each question, provide:
- A score from 1 to 10 (10 = perfect Mom Test question)
- An array of issue types from: hypothetical, opinion, leading, yes_no, compliment_seeking, too_generic, future_focused
- A brief explanation of the assessment
- For questions scoring below 7: a concrete rewritten suggestion that follows Mom Test principles
- For questions scoring 7+: no suggestion needed (null)`;

export const SAMPLE_SIZE_GUIDELINES = {
  INTERVIEW: {
    min: 5,
    max: 15,
    reasoning: "Qualitative interviews typically reach saturation at 8-12 participants. 5 is the minimum for patterns to emerge.",
  },
  SURVEY: {
    min: 30,
    max: 200,
    reasoning: "Surveys need at least 30 responses for basic statistical significance. More participants = more reliable trends.",
  },
  FOCUS_GROUP: {
    min: 6,
    max: 24,
    reasoning: "Focus groups work best with 6-8 participants per group. Run 2-3 groups for reliable consensus.",
  },
  USABILITY_TEST: {
    min: 5,
    max: 10,
    reasoning: "Nielsen's research shows 5 users find ~85% of usability issues. 8-10 for quantitative confidence.",
  },
} as const;
