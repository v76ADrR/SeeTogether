# Agent Instructions

These rules apply to every agent working in this repository.

## Available tools

The currently available tools are:

- Agy CLI
- IDE
- Cursor
- Grok Bot
- Grok CLI

Use these tools only when they are relevant to the task. Do not assume access to additional tools or services without confirming that they are available.

## Git and GitHub

- Never run `git push`, `git push --force`, or any command that publishes changes to GitHub unless the user explicitly asks for it in the current conversation.
- Do not create, edit, merge, close, or delete GitHub issues or pull requests unless the user explicitly asks.
- Keep changes local by default. It is acceptable to inspect status, history, branches, remotes, and diffs.
- Before any commit, show the user what will be committed and wait for explicit approval unless the user already requested the commit.
- Never use force-push or destructive Git commands such as `git reset --hard` or `git clean -fd` without explicit approval.
- Do not commit secrets, credentials, API keys, generated dependencies, or local environment files.
- Never commit personal Git, IDE, editor, or user configuration; respect `.gitignore`, run or remind the user to run `npm run sanitize` before pushing, and do not re-add ignored personal files.

## Changes and validation

- Read the relevant code before editing and make the smallest complete change.
- Preserve existing behavior unless the user requests a behavior change.

### Frozen (do not mess with — warn and wait)

These regional Systems parts are frozen at the **current good stage** (UI, functioning, and logic). If a task would change them, give an **explicit warning** of what you are about to change and **wait for user approval**. Do not silently rewrite.

**Pills covered:** **All**, **Skeleton**, **Trigeminal**, **Face**, **Organs**.

- **All** preset and working behavior: frozen. Snapshot persist across leaving/returning to All; toggles/locks; empty All stays empty after round-trips. Do not reset All to a default overview when switching pills. Do not rename, remove, or simplify All without explicit approval.
- **Skeleton** preset and its options: frozen. Do not rename, remove, retag, reorder, or simplify without explicit approval.
- **Skeleton working behavior** (also frozen): Skeleton menu rows, far-right locks, on/off + lock persist across pill switches, Body surface not auto-enabled on return, empty state when all rows off. Do not change this functionality unless the user explicitly asks in the current conversation after your warning.
- **Trigeminal** preset and its options: frozen, including **Left**, **Right**, and **Both**. Do not rename, remove, retag, reorder, or simplify without explicit approval.
- **Trigeminal working behavior** (also frozen): menu rows (including Skeleton and Body surface in that menu), far-right locks, persist across pill switches, laterality, nerve overlays (CNV / V1 / V2 / V3 and related) on the shared visibility path, empty state when all rows off. Do not change this functionality unless the user explicitly asks in the current conversation after your warning.
- **Face** preset and its options: frozen (pill between Trigeminal and Organs; Muscles + Soft tissue sections). Do not rename, remove, retag, reorder, or simplify without explicit approval.
- **Face working behavior** (also frozen): Face menu rows (Skeleton/Body surface on Face, Muscles — Masseter, Temporalis, Buccinator, Orbicularis, Zygomaticus, Pterygoids — Soft tissue / SMAS stack), far-right locks, on/off + lock persist across pill switches, row layout with toggle+lock pinned visible, Face muscle teaching meshes and Soft tissue overlay stacking without blocking, empty state when all rows off. Do not change this functionality unless the user explicitly asks in the current conversation after your warning.
- **Organs** preset and its options: frozen. Do not rename, remove, retag, reorder, or simplify without explicit approval.
- **Organs working behavior** (also frozen): Organs menu rows, far-right locks, on/off + lock persist across pill switches (same shared pattern as the other pills), empty state when all rows off. Do not change this functionality unless the user explicitly asks in the current conversation after your warning.
- Detail card adaptive height: frozen. Do not hardcode a height or minimum height that can spill into or cover the orbit hint.
- **Future options:** you may **add** new systems/rows/pills when the user asks. You may adjust UI only as needed to fit **new** options (spacing, scroll, adaptive card). You must **not** break, reshape, or regress existing frozen pills’ UI, functioning, or logic. Warn and wait before any change that touches frozen behavior.
- Large or structural UI changes to existing frozen Systems cards require warn-and-wait. Small UI-only polish is OK only when the task is clearly UI-only and does not alter frozen behavior.

### Project base (do not get confused)

- Foundation is a **human-atlas / BodyParts3D** style app. **Face** (Muscles teaching stand-ins + Soft tissue / SMAS) is an add-on pill, not stock atlas muscles.
- Soft tissue is not BodyParts3D “Muscles.” Do not invent new Face stacks or rebuild frozen pills to “make Face work.”
- Before any Face / Soft tissue / face-muscle change, give an **explicit warning** and wait for approval.

### Other

- Use the project's existing scripts for formatting, type-checking, validation, and builds.
- Run targeted validation after changes and report failures plainly.
- Do not install new dependencies or change dependency manifests unless the task requires it.

## Communication

- Explain what changed and identify any validation that was run.
- If a requirement is ambiguous or an action would publish, delete, overwrite, or otherwise have an external effect, ask the user first.
