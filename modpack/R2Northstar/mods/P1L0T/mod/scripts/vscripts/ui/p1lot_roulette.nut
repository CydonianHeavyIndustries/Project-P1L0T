untyped

global function P1L0T_OpenMoveWheel
global function P1L0T_OpenCombatWheel
global function P1L0T_CloseRouletteMenu
global function P1L0T_SetRoulettePriority

const int P1L0T_ROULETTE_SHARDS = 8
const string P1L0T_ROULETTE_MOVE = "P1L0T_Move"
const string P1L0T_ROULETTE_COMBAT = "P1L0T_Combat"

const string P1L0T_CMD_MOVE = "move"
const string P1L0T_CMD_ATTACK = "attack"
const string P1L0T_CMD_DEFEND = "defend"
const string P1L0T_CMD_HOLD = "hold"
const string P1L0T_CMD_SPLIT = "split"
const string P1L0T_CMD_REJOIN = "rejoin"
const string P1L0T_CMD_FOCUS = "focus"
const string P1L0T_CMD_OBJECTIVE = "objective"

const asset P1L0T_ICON_FOLLOW = $"vgui/HUD/threathud_titan_friendlyself"
const asset P1L0T_ICON_GUARD = $"vgui/HUD/threathud_titan_friendlyself_guard"
const asset P1L0T_ICON_ATTACK = $"vgui/HUD/coop/minimap_coop_nuke_titan"
const asset P1L0T_ICON_FOCUS = $"vgui/HUD/obituary_headshot"
const asset P1L0T_ICON_OBJECTIVE = $"vgui/HUD/op_drone_mini"
const asset P1L0T_ICON_HOLD = $"vgui/HUD/coop/coop_ammo_locker_icon"
const asset P1L0T_ICON_REJOIN = $"vgui/HUD/op_health_mini"
const asset P1L0T_ICON_SPLIT = $"vgui/HUD/op_ammo_mini"

array<string> P1L0T_MOVE_LABELS = [ "Go", "Defend", "Objective", "Rejoin", "Hold", "Split" ]
array<string> P1L0T_MOVE_CMDS = [ P1L0T_CMD_MOVE, P1L0T_CMD_DEFEND, P1L0T_CMD_OBJECTIVE, P1L0T_CMD_REJOIN, P1L0T_CMD_HOLD, P1L0T_CMD_SPLIT ]
array<asset> P1L0T_MOVE_ICONS = [ P1L0T_ICON_FOLLOW, P1L0T_ICON_GUARD, P1L0T_ICON_OBJECTIVE, P1L0T_ICON_REJOIN, P1L0T_ICON_HOLD, P1L0T_ICON_SPLIT ]
array<string> P1L0T_COMBAT_LABELS = [ "Attack", "Focus", "Objective", "Defend", "Hold", "Rejoin" ]
array<string> P1L0T_COMBAT_CMDS = [ P1L0T_CMD_ATTACK, P1L0T_CMD_FOCUS, P1L0T_CMD_OBJECTIVE, P1L0T_CMD_DEFEND, P1L0T_CMD_HOLD, P1L0T_CMD_REJOIN ]
array<asset> P1L0T_COMBAT_ICONS = [ P1L0T_ICON_ATTACK, P1L0T_ICON_FOCUS, P1L0T_ICON_OBJECTIVE, P1L0T_ICON_GUARD, P1L0T_ICON_HOLD, P1L0T_ICON_REJOIN ]

struct
{
	bool initDone = false
} file

void function P1L0T_OpenMoveWheel()
{
	P1L0T_EnsureRouletteInit()
	OpenRouletteMenu( P1L0T_ROULETTE_MOVE )
}

void function P1L0T_OpenCombatWheel()
{
	P1L0T_EnsureRouletteInit()
	OpenRouletteMenu( P1L0T_ROULETTE_COMBAT )
}

void function P1L0T_CloseRouletteMenu()
{
	UICodeCallback_NavigateBack()
}

void function P1L0T_SetRoulettePriority( string configName, string title, string priorityText )
{
	string description = priorityText == "" ? "" : ( "Priority: " + priorityText )
	SetupRoulette( configName, title, description )
}

void function P1L0T_EnsureRouletteInit()
{
	if ( file.initDone )
		return

	P1L0T_RegisterRouletteConfig( P1L0T_ROULETTE_MOVE, P1L0T_MOVE_LABELS, P1L0T_MOVE_CMDS, P1L0T_MOVE_ICONS, "Movement Orders" )
	P1L0T_RegisterRouletteConfig( P1L0T_ROULETTE_COMBAT, P1L0T_COMBAT_LABELS, P1L0T_COMBAT_CMDS, P1L0T_COMBAT_ICONS, "Combat Orders" )
	file.initDone = true
}

void function P1L0T_RegisterRouletteConfig( string configName, array<string> labels, array<string> commands, array<asset> icons, string title )
{
	for ( int i = 0; i < P1L0T_ROULETTE_SHARDS; i++ )
	{
		string label = ""
		string commandType = ""
		bool showText = false
		asset icon = $""
		bool showImage = false

		if ( i < labels.len() )
		{
			label = labels[i]
			commandType = commands[i]
			showText = true
			if ( i < icons.len() )
			{
				icon = icons[i]
				showImage = ( icon != $"" )
			}
		}

		RegisterShard( configName, i, icon, label, showImage, showText, false,
			void function ( int index, entity localPlayer, var roulette ) : ( commandType )
			{
				if ( commandType == "" )
					return
				RunClientScript( "CodeCallback_P1L0T_RouletteCommand", commandType )
			},
			<255, 255, 255> )
	}

	SetupRoulette( configName, title )
}
