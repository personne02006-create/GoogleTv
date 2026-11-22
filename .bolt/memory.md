# Project memory

## Product intent & audience

- Video platform with a reward/earning system; users watch, like, and favorite videos to earn rewards.
- Users can withdraw earned rewards; withdrawal page shows available balance and a withdrawal form.
- UI is in French; formal register ("vous").
- Currency is XOF (West African CFA franc); regional financial / mobile-money context.
- Certification flow: user pays a tax code fee → admin manually certifies the account → user can proceed.

## Brand personality & voice

- UI copy in French; formal, directive phrasing for refusal/blocking states.
- Explanatory tone for certification and verification steps.

## Visual design & UX direction

- Built with Vite + React.
- Withdrawal page structure: available balance → withdrawal form → code step ("niveau du code").
- Video engagement statistics removed from withdrawal page; only balance and code level remain.
- Certification screen: title states account is not authorized; explanation states certification is required; cost line shows fee with amount in bold.
- "Continuer" button on certification screen is disabled until `profile.is_certified` is true; shows a waiting message while disabled.
- App polls certification status every 5 seconds so the button auto-enables once admin certifies.
- Amounts formatted with thousands space separator and currency suffix (e.g., `35 580 XOF`).
- Preview edits can be applied to source; identical preview changes map to a single source edit.
- Certification badge: blue checkmark icon replaces the previous red cross on the certification step.
- Badge is displayed next to user names (first name on home, full name in profile) only when `profile.is_certified` is true; kept small/discreet, not oversized.
- Badge also shown on the withdrawal/certification step in place of the red cross.

## Decisions, constraints & rationale

- Framework: `vite-react`.
- Build must pass after changes.
- Removed video statistics from withdrawal page per user request.
- Certification "Continuer" button gated on `profile.is_certified` per explicit user request — admin must certify account before user can proceed to hosting step.
- Polling interval for certification status: 5 seconds.
- Red cross icon on certification step replaced with a blue checkmark badge per user request; same badge reused next to certified user names and in profile.

## Open questions & assumptions

- Full scope beyond withdrawal/certification and video engagement is unknown.
- "Niveau du code" likely refers to a tax code step preceding certification; exact terminology unconfirmed.
- Certification cost (35 580 XOF) may be placeholder or configurable; source of truth unconfirmed.
- Localization strategy (French-only vs. multi-language) is unconfirmed.
- How video engagement translates to earnings/rewards is unconfirmed.
- Admin certification interface/location is unconfirmed.
- Badge image source (user-provided asset vs. icon library) unconfirmed; assumed user-supplied.