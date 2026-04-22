# Anatomy of an Agent — Notes

Notes to accompany the deck for viewers going through it on their own. Each section explains what the slide is showing, why it matters, and where it's leading.

---

## Slide 1 — Title

**Anatomy of an Agent.** An opinionated look at coding with TUI agents.

This deck is about coding agents that run in a terminal — Claude Code, Codex, Pi, Droid, and the like. The goal is to show what's actually happening inside one of these tools: what files shape its behavior, what it does on each turn, and why the choices you make as a user have real, measurable costs. It's opinionated in the sense that it argues for treating your agent as a system you configure deliberately, not a magic box you chat with.

---

## Slide 2 — The X-Ray

**The anatomy of a TUI agent.**

The slide is a three-panel diagram of a working TUI agent, broken into its constituent parts.

On the **left** is the repository — the files on disk that shape how the agent behaves. Two kinds of files live here:

- `AGENTS.md` and `CLAUDE.md` — project memory. Agent-agnostic and Claude-specific respectively. These are always loaded into the context window every turn.
- `.claude/` (or `.agents/`) — a config folder scoped to this repo. Inside it:
  - `commands/` — user-invoked shortcuts, loaded only when you type one.
  - `skills/` — procedural knowledge the agent can pull in on demand. Costs nothing until invoked.
  - `settings.json` — mode definitions, MCP server config, tool configuration.

In the **middle** is the TUI itself — what you actually see when the agent runs. A session header (what got loaded), a conversation area (user messages, thinking, tool calls, results), and a status bar (current mode, active skills, context usage).

On the **right** are four runtime concepts that surface in the TUI:

- **`/commands`** — user-invoked shortcuts. Dormant until called.
- **`modes`** — different operational stances like plan, build, review. Each mode can swap the system prompt and the available tool surface.
- **`skills/`** — lazily loaded procedural knowledge. Color-matched to the `skills/` folder on the left.
- **`tools`** — built-ins, MCP servers, and custom tools. Tool schemas are always loaded so the model knows what's available; tool bodies only run when called.

**The key idea:** every one of these components has a cost in the agent's context window, and **when** that cost is paid matters as much as how much it costs.

- **Always loaded** (red badge) — paid every turn. AGENTS.md, tool schemas.
- **Session** (yellow badge) — paid on load, stays paid. Modes, settings.
- **On demand** (green badge) — paid only when used. Commands, skills.

Click any of the four right-column cards to see where it lives on disk (the tree dims except for the matching entry) and where it surfaces in the TUI (the conversation dims except for the lines that correspond). The point of the interaction is to make the connection between "this thing I configured on disk" and "this thing happening at runtime" concrete.

Every component is designed to improve the ability of the model to give great results by controlling what it sees as context. The rest of the deck is about how that control works.

---

## Slide 3 — The Loop

**Every turn replays the whole conversation.**

The slide shows an agent executing across two consecutive user turns, animated. Three panels:

- **Left:** a circular diagram of the four phases of the agentic loop — receive, think, act, observe — with transport controls (play, step, stop) below.
- **Middle:** the TUI from slide 2, showing what the user sees as the loops run.
- **Right:** a visual representation of the context window, growing brick by brick as the loops progress.

### The four phases of the loop

Every turn, the agent runs through four phases in order:

- **Receive** — the agent reads its accumulated context window: system prompt, project memory, conversation history, and whatever the user just typed.
- **Think** — the agent reasons about what to do. (Most TUI agents label this "thinking" rather than "planning" to avoid confusion with plan mode, a separate concept.)
- **Act** — the agent calls a tool (read a file, run a command, search the web).
- **Observe** — the tool returns a result, which the agent incorporates into its next thought.

Those four phases complete one turn. The next user message triggers another four-phase turn. The animation on this slide shows two turns back-to-back, because the interesting thing happens *between* them.

### Accumulation — the point of the slide

Watch what happens when you play through the animation:

- **Loop 1** fills the outer ring amber as the four phases fire. Bricks appear in the context window panel on the right: one amber (user), one purple (thinking), one orange (tool call), one green (result).
- **Loop 2** starts at `receive` again. But the inner ring lights up separately — because loop 2 is a new set of phases *on top of* loop 1. And critically, the bricks from loop 1 are still there. They dim slightly to signal "this is history," but they haven't been evicted from the context window.

This is the whole point: **the next user turn does not start fresh.** Everything from the previous turn — every thought, every tool call, every result — is still loaded into the context window and gets sent to the model again on every subsequent turn.

### The cost

The token counter in the top-right of the context window panel ticks up with each brick. By the end of two short turns, it's already in the hundreds of tokens. In real sessions this grows to tens of thousands quickly — and it all gets re-sent on every turn. The conversation accumulates; the cost compounds.

That's the setup for the next slide: if context is accumulating every turn, and every turn pays for all of it, then context is a **budget**, not a buffer. What you put in it, and when, is a design decision.

---

*More slides will be added here as the deck develops.*

---

## Planning notes (not yet built)

### Slide 11 — Subagents

Subagents are a meaningfully different context-management strategy from the ones covered in slides 5–10. Those slides are about *managing accumulation* within a single context window (what to put in AGENTS.md, when to load skills, how to curate tools). Subagents *escape* accumulation by spawning a sub-loop with a fresh context window.

Framing to land on the slide:

- The pivot is "don't manage accumulation, sidestep it."
- Show a task that would bloat the main loop (e.g. a big research sweep, an exhaustive code audit), delegate it to a subagent with a fresh context, and observe that only the compact result comes back to the parent loop.
- Not free: subagents cost the tokens to spawn, and the result handed back still enters the parent's context. The framing is **"subagents move cost to a cheaper budget,"** not "subagents eliminate context cost."
- Tool divergence is an Act 3 opinion opportunity: Claude Code bakes subagents in; Pi deliberately doesn't, arguing you should build the workflow yourself with tmux or custom extensions.

Visual idea worth considering:

- The ring diagram from slide 3 could reappear here. A subagent shown as a *third ring* spawning off the main loop, running its own four-phase cycle in isolation, then delivering a single compact result back to the parent's context window.
- The brick panel would show the main loop's bricks staying relatively flat while the subagent burns through its own bricks in a separate panel — and only one green "result" brick makes it back to the main window. Makes the savings visceral.