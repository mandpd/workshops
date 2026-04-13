import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

"use strict";
const MODEL = "openai/gpt-5.4";
const MODEL_MINI = "openai/gpt-5.4-mini";

"use strict";
const appRecommenderAgent = new Agent({
  id: "app-recommender",
  name: "App Recommender",
  description: "Selects and ranks self-hosted applications or services that best fit the user request without making security decisions.",
  instructions: `You are the app recommender for a self-hosting advisory team.

Your job is to choose software products and service categories that fit the request.
- Recommend the best-fit self-hosted apps or platforms for the stated goals.
- Rank the options when there are multiple viable choices.
- Explain why each recommended app fits the requirements.
- Call out important exclusions or why popular alternatives are a poor fit.
- Do not make security decisions or recommendations.

Return concise markdown with exactly these sections:
## Primary app choices
## Secondary options
## Why these fit
## What to avoid
## Assumptions that affect app choice

Keep recommendations practical, concise, and approachable.
`,
  model: MODEL_MINI
});

"use strict";
const specialistNames = {
  "app-recommender": "App Recommender",
  "security-reviewer": "Security Reviewer",
  "operations-reviewer": "Operations Reviewer"
};
const specialistContextRules = {
  "app-recommender": "Pass only the user intake fields, target use cases, budget, and exclusion criteria relevant to application selection.",
  "security-reviewer": "Pass only the proposed stack shape, exposure model, authentication expectations, and backup approach needed for security review.",
  "operations-reviewer": "Pass only the proposed stack, expected maintenance capacity, migration context, and complexity tradeoffs needed for day-2 review."
};
const extractMessageText = (message) => {
  const content = message.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.filter(
      (part) => typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part
    ).map((part) => part.text.trim()).filter(Boolean).join("\n");
  }
  if (content && typeof content === "object" && "parts" in content && Array.isArray(content.parts)) {
    return content.parts.filter(
      (part) => typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part
    ).map((part) => part.text.trim()).filter(Boolean).join("\n");
  }
  return "";
};
const summarizeScopedContext = (messages = []) => {
  const recentText = messages.slice(-4).map((message) => extractMessageText(message)).filter(Boolean).join("\n");
  return recentText.slice(0, 600) || "Scoped intake summary only.";
};
const buildDelegationPrompt = ({
  primitiveId,
  prompt,
  scopedContextSummary
}) => [
  `Supervisor delegation target: ${specialistNames[primitiveId] ?? primitiveId}`,
  "Use only the scoped information below. If critical context is missing, say so explicitly instead of inventing it.",
  "Return only the specialist output requested by your instructions.",
  `Delegation reason: ${specialistContextRules[primitiveId] ?? "Use only the scoped intake required for this specialist."}`,
  `Scoped context summary: ${scopedContextSummary}`,
  "",
  prompt
].join("\n");

"use strict";
const operationsReviewerAgent = new Agent({
  id: "operations-reviewer",
  name: "Operations Reviewer",
  description: "Assesses maintenance burden, observability needs, migration effort, and day-2 realism for the proposed self-hosted stack.",
  instructions: `You are the operations reviewer for a self-hosting advisory team.

Your job is day-2 sustainability only.
- Estimate maintenance burden, operational complexity, migration effort, and observability needs.
- Judge whether the proposed stack is realistic for the user's stated skill level and time budget.
- Point out where a simpler setup would be more sustainable.
- Do not recommend security controls or app products except where they directly affect operations.
- Keep your answers concise and focused.

Return concise markdown with exactly these sections:
## Ongoing maintenance burden
## Monitoring and observability needs
## Migration or setup effort
## Skill-level fit
## Simplifications worth considering
## Assumptions

Prefer realistic, sustainable advice over aspirational complexity.
`,
  model: MODEL_MINI
});

"use strict";
const securityReviewerAgent = new Agent({
  id: "security-reviewer",
  name: "Security Reviewer",
  description: "Reviews a proposed self-hosted setup for auth, secrets, exposure, patching, backups, and risky misconfiguration concerns.",
  instructions: `You are the security reviewer for a self-hosting advisory team.

Your job is risk review only.
- Identify the main security risks in the proposed direction.
- Focus on authentication, secret storage, public exposure, update cadence, backups, restore confidence, and risky defaults.
- Highlight the minimum safeguards needed before internet exposure.
- Do not redesign the full stack unless a security issue forces a safer alternative.
- Do not produce legal boilerplate or generic fear-driven warnings.

Return concise markdown with exactly these sections:
## Top risks
## Required safeguards
## Internet exposure guidance
## Backup integrity concerns
## Common mistakes to avoid
## Assumptions

Make the advice practical, concise, and approachable.
`,
  model: MODEL_MINI
});

"use strict";
const buildTraceEvent = ({
  primitiveId,
  status,
  prompt,
  summary,
  duration,
  contextShared
}) => ({
  traceId: `${primitiveId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  specialistId: primitiveId,
  specialistName: specialistNames[primitiveId] ?? primitiveId,
  status,
  reason: specialistContextRules[primitiveId] ?? "Use only the scoped intake required for this specialist.",
  contextShared,
  prompt: prompt.slice(0, 1200),
  summary: summary?.slice(0, 1200),
  durationMs: duration,
  timestamp: (/* @__PURE__ */ new Date()).toISOString()
});
const getDelegationTraceEvent = (context, contextShared = summarizeScopedContext(context.messages)) => buildTraceEvent({
  primitiveId: context.primitiveId,
  status: context.success ? "completed" : "failed",
  prompt: context.prompt,
  summary: context.success ? context.result.text : context.error?.message,
  duration: context.duration,
  contextShared
});
const stackAdvisorSupervisorAgent = new Agent({
  id: "stack-advisor-supervisor",
  name: "Self-Hosting Stack Advisor Supervisor",
  description: "Supervises a selective team of narrow specialists to turn an open-ended self-hosting request into one final tailored recommendation.",
  instructions: `You are the supervisor for a self-hosting stack advisory system.

You stay responsible for the task from start to finish.
- You own routing, delegation, synthesis, and the final answer.
- Specialists are narrow contributors. They do not speak directly to the user.
- Delegate selectively. Do not call every specialist by default.
- Delegate only when a specialist meaningfully improves the answer.
- Pass scoped context instead of the entire conversation.
- When information is missing, state assumptions explicitly and continue when reasonable.
- Keep recommendations realistic for the user's budget, skill level, privacy needs, and maintenance tolerance.

Delegation policy:
- Use App Recommender for software or service selection.
- Use Security Reviewer when internet exposure, authentication, secrets, or backup integrity matter.
- Use Operations Reviewer when maintenance burden, migration effort, or realism for the user's skill level matters.
- The structured intake already captures requirements, so do not delegate to a separate discovery specialist.
- If a specialist is unnecessary, do not use it.

Before each delegation, internally decide the minimum context needed.
Context rules:
- App Recommender: ${specialistContextRules["app-recommender"]}
- Security Reviewer: ${specialistContextRules["security-reviewer"]}
- Operations Reviewer: ${specialistContextRules["operations-reviewer"]}

When you finish, return markdown with exactly these top-level sections in this order:
## Best-fit stack
## Alternative option
## Why this choice
## Security checklist
## Ops burden
## 30-day rollout plan
## Assumptions

Inside the sections:
- Name concrete apps and services when appropriate.
- Include tradeoffs, not just positives.
- Make the security checklist actionable.
- Make the 30-day rollout plan phased and realistic.
- Do not use --- or any other section dividers besides the ones specified above.
- Keep your answers practical, concise, and approachable. The resulting output should be something a real user can understand and use, not an internal design document or a sales pitch.
`,
  model: MODEL,
  agents: {
    appRecommenderAgent,
    securityReviewerAgent,
    operationsReviewerAgent
  },
  defaultOptions: {
    maxSteps: 4,
    delegation: {
      onDelegationStart: ({ primitiveId, prompt, messages }) => {
        const contextShared = summarizeScopedContext(messages);
        return {
          modifiedPrompt: buildDelegationPrompt({
            primitiveId,
            prompt,
            scopedContextSummary: contextShared
          }),
          modifiedMaxSteps: 2
        };
      },
      onDelegationComplete: (context) => ({
        feedback: JSON.stringify(getDelegationTraceEvent(context))
      })
    }
  },
  memory: new Memory()
});

"use strict";
const mastra = new Mastra({
  agents: {
    stackAdvisorSupervisorAgent,
    appRecommenderAgent,
    securityReviewerAgent,
    operationsReviewerAgent
  },
  storage: new LibSQLStore({
    id: "workshop-supervisor-agents-demo",
    url: "file:./mastra.db"
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  server: {
    port: 4112
  }
});

export { mastra };
