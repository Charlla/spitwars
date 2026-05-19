# Spit Wars — Claude Code Instructions

> 📚 **Canonical patterns live in the BAB framework.** Read these first:
> - `/home/charl/code/bab/knowledge/auth.md` — OTP sign-in + display-name capture
> - `/home/charl/code/bab/knowledge/design-systems.md` — games UI components
> - `/home/charl/code/bab/knowledge/security.md` — HumanVerify + headers + audit log
> - `/home/charl/code/bab/knowledge/conventions.md` — cross-cutting rules

Spit Wars is a turn-based llama-artillery game. BAB slug: `spitwars` |
Table prefix: `spitwars_` | Domain: `spitwars.com`.

## Key rules

- **Auth**: OTP-only email sign-in via the canonical module. Cookie: `spitwars_session`. HumanVerify HMAC token required.
- **Online play**: rooms require sign-in (`/api/rooms` POST returns 401 if not authed).
  Room codes are auto-generated 6-char A-Z0-9 with uniqueness check — never hardcoded.
- **Display name**: `spitwars_players.display_name` captured on first sign-in
  before the lobby loads (see `room-lobby.tsx`).
- **Design system**: games — `components/games/`. Hero gradient orange (team 0)
  → cyan (team 1). Accent `#f97316`, accent-2 `#06b6d4`.
- **HUD**: `spitwars-hud.tsx` shows aim/power/movement controls during gameplay;
  `≡ MENU` button → `PauseOverlay` (no scattered "QUIT" links inside gameplay).
- **Mobile-first** + inputs ≥16px via globals.css `!important`.

@AGENTS.md
