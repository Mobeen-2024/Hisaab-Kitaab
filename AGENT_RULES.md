# AGENT RULES

## Token Saving
- Never scan the full codebase automatically.
- Never read all folders before a small change.
- Start from PROJECT_CONTEXT.md.
- Only inspect files directly related to the task.
- Ask before reading more files.
- Do not open folders recursively unless explicitly approved.
- Do not summarize the entire project unless asked.

## Coding Rules
- Make minimal changes.
- Preserve existing architecture.
- Reuse existing components, services, schemas, hooks, and utilities.
- Do not create duplicate logic.
- Do not rename files unless required.
- Do not refactor unrelated code.
- Do not change formatting-only unless asked.
- Prefer patch-level edits instead of rewriting full files.

## Response Rules
- Keep answers short.
- Show only important changes.
- Do not paste entire files unless asked.
- Always report:
  - Files inspected
  - Files changed
  - Why those files were needed
  - How to test

## Context Update Rules
- Update PROJECT_CONTEXT.md only when architecture, data flow, major features, schemas, services, or important logic changes.
- Do not add temporary debugging notes.
- Do not add full file trees.
- Keep PROJECT_CONTEXT.md concise.
- Remove outdated information when updating it.
