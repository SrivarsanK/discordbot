# Coding Agent Rules

## Risk Assessment Check
Perform a risk check before any modifying action (file edits, running commands, database migrations).

### Risk Tiers
- **Low**: local, reversible, no sensitive data, narrow scope.
- **Medium**: shared code paths, moderate impact, recoverable with effort.
- **High**: production data/systems, destructive commands, broad impact.

### Risk Process
1. Assign a risk tier with a one-line justification.
2. Apply safeguards:
   - **Low**: proceed with standard checks.
   - **Medium**: expand tests and call out rollback path.
   - **High**: request explicit approval before proceeding.
3. If uncertain between tiers, choose the higher tier.

### Safety Rules
- Never expose credentials, tokens, or secret files.
- Never run destructive operations without explicit user confirmation.
- Clearly list assumptions that could affect correctness.

### Output Format
Include a risk check summary at the beginning of the action outlining:
- **Risk Tier**
- **Safeguards Used**
- **Verification Run**
- **Residual Risk**

---

## Version Control Discipline & Atomic Commits

### Core Principles

**Atomicity**: One commit = one logical unit of work. A logical unit is the smallest change that is complete and meaningful on its own. It is never "everything I changed today."

**Independence**: Every commit must compile, pass tests, and be revertable without breaking unrelated functionality.

**Intentionality**: The commit message describes *why*, not *what*. The diff already shows what changed.

### Commit Message Format

```
<type>(<scope>): <imperative summary under 72 chars>

<body — required if change needs context, wrapped at 72 chars>
Explain WHY this change is necessary. What problem does it solve?
What was the previous behavior and why was it wrong or insufficient?

<footer — optional>
Refs: #123
BREAKING CHANGE: <description>
Co-authored-by: Name <email>
```

**Types**: feat | fix | refactor | perf | test | docs | style | build | ci | chore
**Scope**: the module, component, or domain affected (e.g., auth, parser, api/users)
**Summary**: imperative mood ("add", "fix", "remove" — not "added", "fixes", "removing")

### Decomposition Rules

Before writing any code, decompose the work. When given a task, you MUST:

1. **Identify all logical units** — list every distinct concern the task touches (e.g., schema migration, business logic, API handler, tests, docs).
2. **Order them by dependency** — foundational changes first; never commit a consumer before its dependency.
3. **Assign one commit per unit** — if a commit touches unrelated files, it is not atomic.
4. **Declare the plan** — output the proposed commit sequence before writing code:

```
Proposed commit sequence:
1. refactor(db): extract user query builder from inline SQL
2. feat(db): add index on users.email for lookup performance  
3. feat(auth): implement email-based login using user query builder
4. test(auth): add unit tests for email login flow
5. docs(auth): update API reference for POST /auth/login
```

### Hard Rules

- **Never mix refactoring with feature work** in one commit. Refactor first, then build.
- **Never commit commented-out code**, debug statements, or temporary scaffolding.
- **Never bundle a bug fix with a feature** unless the bug fix is a prerequisite for the feature (and even then, consider whether it belongs in a separate prior commit).
- **Never let formatting/whitespace changes share a commit** with logic changes.
- **Test commits are siblings, not children** — if a feature commit adds `getUserById()`, a corresponding test commit `test(users): add tests for getUserById` follows immediately, not at the end of the sprint.
- **Never use "WIP", "misc", "cleanup", "various fixes", or "updates"** as commit messages. These are signals of non-atomic thinking.

### Staging Discipline

When working interactively, use hunks, not files:
- `git add -p` to stage individual hunks
- `git diff --staged` to verify staged content before committing
- `git stash` to isolate unrelated in-progress work
- `git commit --amend` or `git rebase -i` to correct mistakes before pushing
- **Auto-Sync**: Pull remote changes (`git pull --rebase`) before starting work or committing to prevent merge conflicts and keep local history clean.

### Self-Check Before Every Commit

Ask yourself:
1. Can I describe this change in one sentence without using "and"?
2. If I revert this commit alone, does the codebase still work?
3. Does this commit include any change that isn't directly required for the stated purpose?
4. Would a reviewer need to context-switch to understand different concerns in this diff?

If any answer is wrong, split the commit.

### Output Format for Code Tasks

When producing code changes, always structure your output as:

---
**Commit 1 of N** — `type(scope): summary`

*Rationale*: [one sentence on why this change is isolated here]

[file changes]

---
**Commit 2 of N** — `type(scope): summary`
...
