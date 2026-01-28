# Project-P1L0T
a full Titanfall 2 overhaul modpack mod manager.

## Releases
- Tagging `vX.Y.Z` triggers the GitHub Actions release workflow to build the installer and publish the `Project-P1L0T-Setup-<version>.exe` to the GitHub release by default.
- The launcher downloads `Project-P1L0T-modpack.zip` from the latest GitHub release. The modpack is stored locally and is not committed to git.

### Build the launcher installer (Windows)
```powershell
powershell -File scripts/build-launcher-installer.ps1
```
The installer will be output to `launcher/desktop/dist/Project-P1L0T-Setup-<version>.exe`.

### Build the modpack zip
```powershell
powershell -File scripts/build-modpack.ps1
```
Upload the resulting `Project-P1L0T-modpack.zip` to the GitHub release for the tag.
