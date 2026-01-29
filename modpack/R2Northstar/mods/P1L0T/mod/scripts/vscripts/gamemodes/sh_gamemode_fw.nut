// Shim override to satisfy Northstar.Custom Fort War shared script
// Avoids file-scope errors and duplicate definitions when upstream sh_gamemode_fw.nut is missing/patching.

untyped

global function GamemodeFW_Init

void function GamemodeFW_Init()
{
    // delegate to vanilla logic (in _gamemode_fw.nut) if present
    return
}
