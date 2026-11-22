# Project memory

## Product intent & audience

- Video platform with a reward/earning system; users watch, like, and favorite videos to earn rewards.
- Users can withdraw earned rewards; withdrawal page shows available balance and a withdrawal form.
- UI is in French; formal register ("vous").
- Currency is XOF (West African CFA franc); regional financial / mobile-money context.

## Brand personality & voice

- UI copy in French; formal, directive phrasing for refusal/blocking states.
- Explanatory tone for certification and verification steps.

## Visual design & UX direction

- Built with Vite + React.
- Withdrawal page structure: available balance → withdrawal form → code step ("niveau du code").
- Video engagement statistics (videos watched, liked, favorited, validated rewards) were removed from the withdrawal page; only balance and code level remain.
- Certification refusal screen: title states account is not authorized; explanation states certification is required; cost line shows fee with amount in bold.
- Amounts formatted with thousands space separator and currency suffix (e.g., `35 580 XOF`).
- Preview edits can be applied to source; identical preview changes map to a single source edit.

## Decisions, constraints & rationale

- Framework: `vite-react`.
- Build must pass after changes.
- Removed video statistics from withdrawal page per user request; withdrawal flow now focuses solely on balance, form, and code step.

## Open questions & assumptions

- Full scope beyond withdrawal/certification and video engagement is unknown.
- "Niveau du code" — whether this is a security code, verification level, or promo code step is unconfirmed.
- Certification cost (35 580 XOF) may be placeholder or configurable; source of truth unconfirmed.
- Localization strategy (French-only vs. multi-language) is unconfirmed.
- How video engagement translates to earnings/rewards is unconfirmed.