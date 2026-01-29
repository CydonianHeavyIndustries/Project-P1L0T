# Project-P1L0T TODO

## Now (Core Stability)
- Phone booth: persist bind + E use refills meter (no "Titan not ready" in lobby)
- Forge save/load: NSLoadJSONFile fallback to NS_InternalLoadFile + DecodeJSON
- Command status RUI: guard destroyed instance crash (client fix in place; needs live test)
- V wheel: lock view while held (server ViewCone lock + client toggle in place; needs live test)
- Wheel priority: tap V for move (!/!!/!!!), scroll for combat (I-X) (logic in place; needs live test)
- Ping visuals: swap to Juicy pings assets for move/combat (done; needs live test)
- Main menu branding: Project-P1L0T label + logo (updated; needs test)

## Now (Sandbox Lobby)
- Exoplanet FD easy lobby stable (no waves, player immortal, enemy aggro off)
- Forge toggle on Insert (HUD text in place; needs UI/menu polish)
- Forge HUD: add "Set Phone Booth" button (temporary until persistence is stable)
- Forge commands: spawn prop/NPC, delete target, clear, save/load (implemented; needs live test)

## Next (Command System)
- Fix E ping override in titan (V-only)
- Ping targets: restrict to valid floor/targets; keep ping on accessible terrain
- Protect/attack target selection (aim-to-select)
- Replace default follow/guard overrides with new states (guard/attack/follow/idle/protect/objective/ghost/support)
- State icons in titanfall meter (custom assets)
- Screen-space ping confirm + completion indicator
- Chat callouts + Titan OS replies (Freya) tuned per command
- Default follow when command ends or is canceled
- Contextual defend/attack behaviors

## Next (Forge / Creator)
- Forge HUD/menu with cursor unlock + view lock + selection gizmo
- Entity move/rotate/scale + behavior config panel
- Save/load UI in Esc menu
- NPC spawner UI + ambience presets

## Next (UI / Branding)
- Main menu label: Project-P1L0T v1.01.1 (updated; needs test)
- Mod controller entry + settings UI (R2Modman + in-game)
- Ping wheel visual assets + selection arrow
- Borderless windowed option in Video menu (needs menu override)
- Mirror assets folder into mod + wire usage (assets copied; wire usage next)
- Merge mods into Project-P1L0T with credits (roulette, quicktyping, pings, etc.)

## Later (Big Systems)
- Custom titan loadout system (body/core/weapons/abilities mix)
- Character creator + cosmetics mixing
- Fullscreen tactical map (TAB) with click-to-order / titanfall
- Private host/connect flow with passwords
- Titan OS expansion (voice/TTS, contextual responses)
