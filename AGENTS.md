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

## Changes and validation

- Read the relevant code before editing and make the smallest complete change.
- Preserve existing behavior unless the user requests a behavior change.
- Treat the current **Skeleton** preset and its options as frozen. Do not rename, remove, retag, reorder, or simplify them without explicit user approval.
- Treat the current **Trigeminal** preset and its options as frozen, including the **Left**, **Right**, and **Both** controls. Do not rename, remove, retag, reorder, or simplify them without explicit user approval.
- Treat the current **Organs** preset and its options as frozen. Do not rename, remove, retag, reorder, or simplify them without explicit user approval.
- Preserve the detail card's adaptive height. Do not hardcode a height or minimum height that can spill into or cover the orbit hint.
- Use the project's existing scripts for formatting, type-checking, validation, and builds.
- Run targeted validation after changes and report failures plainly.
- Do not install new dependencies or change dependency manifests unless the task requires it.

## Communication

- Explain what changed and identify any validation that was run.
- If a requirement is ambiguous or an action would publish, delete, overwrite, or otherwise have an external effect, ask the user first.
