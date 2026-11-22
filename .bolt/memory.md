# Project memory

## Product intent & audience

- Video platform with a reward/earning system; users watch, like, and favorite videos to earn rewards.
- Users can withdraw earned rewards; withdrawal page shows available balance and a withdrawal form.
- UI is in French; formal register ("vous").
- Currency is XOF (West African CFA franc); regional financial / mobile-money context.
- Certification flow: user pays a tax code fee → admin manually certifies the account → user can proceed.
- Withdrawal flow: user enters amount → passes through multiple code steps (hébergement, frais, mise à jour) → request sent to admin for validation → success state "Votre retrait est en cours de validation".

## Brand personality & voice

- UI copy in French; formal, directive phrasing for refusal/blocking states.
- Explanatory tone for certification and verification steps.
- Generic error messages used for failures (e.g., "Votre demande n'a pas pu être envoyée…"); may mask the real cause.

## Visual design & UX direction

- Built with Vite + React.
- Withdrawal page structure: available balance → withdrawal form → code steps (hébergement, frais, mise à jour).
- Video engagement statistics removed from withdrawal page; only balance and code level remain.
- Certification screen: title states account is not authorized; explanation states certification is required; cost line shows fee with amount in bold.
- "Continuer" button on certification screen is disabled until `profile.is_certified` is true; shows a waiting message while disabled.
- App polls certification status every 5 seconds so the button auto-enables once admin certifies.
- Amounts formatted with thousands space separator and currency suffix (e.g., `35 580 XOF`).
- Certification badge: blue checkmark icon; displayed next to user names only when `profile.is_certified` is true; small/discreet.
- Badge also shown on the withdrawal/certification step in place of the previous red cross.

## Decisions, constraints & rationale

- Framework: `vite-react`.
- Build must pass after changes.
- Removed video statistics from withdrawal page per user request.
- Certification "Continuer" button gated on `profile.is_certified`; admin must certify before user proceeds.
- Polling interval for certification status: 5 seconds.
- Blue checkmark badge replaced red cross on certification step per user request; reused next to certified user names and in profile.
- Withdrawal amount fix: send exactly the user-entered amount to admin; do not subtract fees before submission. Fees are considered already validated after the three code steps (hébergement, frais, mise à jour). Previous behavior deducted all fees pre-send, causing the server to receive `0` or an incorrect amount and reject the request with the generic error.

## Open questions & assumptions

- Full scope beyond withdrawal/certification and video engagement is unknown.
- Certification cost (35 580 XOF) may be placeholder or configurable; source of truth unconfirmed.
- Localization strategy (French-only vs. multi-language) is unconfirmed.
- How video engagement translates to earnings/rewards is unconfirmed.
- Admin certification and withdrawal-validation interfaces/locations are unconfirmed.
- Badge image source (user-provided asset vs. icon library) unconfirmed; assumed user-supplied.
- Exact fee deduction logic and whether fees are server-side or client-side is unconfirmed; current fix assumes fees are pre-validated via codes.