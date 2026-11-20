# Contributing to Chronotask

Thank you for your interest in contributing!

## How to contribute

1. **Fork** the repository and create your branch from `main`
2. Make your changes with clear, focused commits
3. Ensure the app builds and typechecks: `npm run lint && npm run build`
4. Open a **Pull Request** describing what you changed and why

## Code style

- TypeScript strict mode — no `any` where avoidable
- Component files in `src/components/`, service files in `src/services/`
- Use the existing semantic CSS tokens (`paper`, `ink`, `accent`, etc.) from `src/index.css` — avoid hardcoded colors

## Reporting bugs

Open a GitHub Issue with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS version

## Feature requests

Open a GitHub Issue tagged `enhancement` with a clear description of the use case.

## Security

Do **not** open public Issues for security vulnerabilities. Email the maintainer directly instead.
