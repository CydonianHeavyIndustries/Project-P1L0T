Project-P1L0T Launcher

- Run: run.cmd
- Config: launcher.config.json
- UI: web/ (built output)
- Desktop app: desktop/start.cmd (run desktop/install.cmd once first)
- Build installer: powershell -File scripts/build-launcher-installer.ps1
- Releases: GitHub releases include `Project-P1L0T-Setup-<version>.exe` by default.

Notes:
- Import expects an extracted mod folder, or a Thunderstore-style zip containing a mods/ folder.
- Compile clears R2Northstar runtime/compiled so scripts rebuild on next launch.
