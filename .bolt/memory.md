# Project memory

## Product intent & audience

- Video platform with a reward/earning system; users watch, like, and favorite videos to earn rewards.
- Users can withdraw earned rewards; withdrawal page shows available balance and a withdrawal form.
- Certification is now free (**0 XOF**); after obtaining the certification code, user status should display "certifié".
- UI is in French; formal register ("vous").
- Currency is XOF (West African CFA franc); regional financial / mobile-money context.

## Brand personality & voice

- UI copy in French; formal, directive phrasing for refusal/blocking states.
- Explanatory tone for certification and verification steps; emphasis on gratuité when applicable.

## Visual design & UX direction

- Built with Vite + React.
- Withdrawal page structure: available balance → withdrawal form → code step ("niveau du code").
- Video engagement statistics removed from withdrawal page; only balance and code level remain.
- Certification screen: refusal explanation states certification is required; cost line replaced with **0 XOF** and a clear "gratuit / aucun paiement requis" mention.
- After certification code is obtained, UI should show "certifié" status.
- Amounts formatted with thousands space separator and currency suffix (e.g., `35 580 XOF`).
- Preview edits can be applied to source; identical preview changes map to a single source edit.

## Decisions, constraints & rationale

- Framework: `vite-react`.
- Build must pass after changes.
- Certification price replaced with **0 XOF** per user request.
- Certification deliberately **not** linked to "code de taxe" chain nor code succession reactivated — to avoid recreating a fee/payment pathway.
- Multiple code types exist in flow: code de classe, code de certification, code de taxe — kept separate.

## Open questions & assumptions

- Full scope beyond withdrawal/certification and video engagement is unknown.
- Exact ordering and conditions for showing "certifié" status after code entry are unconfirmed.
- Relationship between "code de classe", "code de certification", and "code de taxe" in overall flow is partially understood.
- Localization strategy (French-only vs. multi-language) is unconfirmed.
- How video engagement translates to earnings/rewards is unconfirmed.