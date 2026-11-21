# Project memory

## Product intent & audience

- Web app with a withdrawal flow; UI is in French.
- Withdrawal process includes a confirmation step and references "network taxes" (taxes de réseau) that must be paid to validate a withdrawal request.

## Brand personality & voice

- UI copy is in French; formal register ("vous", past-tense explanatory phrasing).

## Visual design & UX direction

- Built with Vite + React.
- Withdrawal confirmation screen contains a heading that communicates payment-status/tax requirements to the user.
- Preview edits can be applied to source; identical preview changes map to a single source edit.

## Decisions, constraints & rationale

- Framework: `vite-react`.
- Build is verified after changes (build must pass).

## Open questions & assumptions

- Full scope of the app beyond the withdrawal flow is unknown.
- Whether the app is crypto/web3-related or uses a different domain is unconfirmed; "network taxes" wording suggests a financial withdrawal context.
- Localization strategy (French-only vs. multi-language) is unconfirmed.