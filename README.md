# Project-P1L0T
a full Titanfall 2 overhaul modpack mod manager.

## Releases
- Tagging `vX.Y.Z` triggers the GitHub Actions release workflow to build the installer.
- The launcher downloads `Project-P1L0T-modpack.zip` from the latest GitHub release. The modpack is stored locally and is not committed to git.

### Build the modpack zip
```powershell
powershell -File scripts/build-modpack.ps1
```
Upload the resulting `Project-P1L0T-modpack.zip` to the GitHub release for the tag.
