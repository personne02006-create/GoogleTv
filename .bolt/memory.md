# Project memory

## Product intent & audience

- Web app with a withdrawal flow; UI is in French.
- Withdrawal requires account certification; uncertified accounts are refused with a specific message.
- Certification has a cost displayed to the user (e.g., 35 580 XOF).
- Currency is XOF (West African CFA franc), suggesting a West African financial / mobile-money context.

## Brand personality & voice

- UI copy is in French; formal register ("vous").
- Explanatory, directive phrasing for refusal/blocking states.

## Visual design & UX direction

- Built with Vite + React.
- Withdrawal flow includes a certification refusal screen: title states the account is not authorized to withdraw; explanation states certification is required; a cost line shows the certification fee with the amount in bold.
- Amounts are formatted with a thousands space separator and the currency code suffix (e.g., `35 580 XOF`).
- Preview edits can be applied to source; identical preview changes map to a single source edit.

## Decisions, constraints & rationale

- Framework: `vite-react`.
- Build is verified after changes (build must pass).

## Open questions & assumptions

- Full scope of the app beyond the withdrawal/certification flow is unknown.
- Whether the app is crypto/web3, mobile money, or another financial domain is unconfirmed; XOF currency and certification cost suggest a regional financial service.
- Certification cost value (35 580 XOF) may be placeholder or configurable; source of truth unconfirmed.
- Localization strategy (French-only vs. multi-language) is unconfirmed.