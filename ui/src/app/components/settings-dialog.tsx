import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  Settings,
  Folder,
  FolderOpen,
  HardDrive,
  Trash2,
  Copy,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  RefreshCw,
  Terminal,
  Package,
  ShieldAlert,
  FileText,
} from "lucide-react";

interface LauncherConfig {
  dataPath?: string;
  profilePath?: string;
  steamPath?: string;
  tf2Path?: string;
}

interface ModpackStatus {
  installed?: boolean;
  currentVersion?: string | null;
  latestVersion?: string | null;
  updateAvailable?: boolean;
  latestError?: string | null;
}

interface SettingsDialogProps {
  modpackStatus?: ModpackStatus | null;
  config?: LauncherConfig | null;
  onDisableAllMods?: () => void;
  onEnableAllMods?: () => void;
  onResetInstallation?: () => void;
  onOpenFolder?: (path: string | undefined, label: string) => void;
  onChangeConfig?: (partial: Partial<LauncherConfig>) => void;
  onImportLocalMod?: () => void;
  onExportProfile?: () => void;
  onImportModpack?: () => void;
  onExportModpack?: () => void;
  onCleanModCache?: () => void;
  onCopyLog?: () => void;
  onCopyTroubleshooting?: () => void;
  onCompatibilityCheck?: () => void;
  onDependencyCheck?: () => void;
  onOpenLogFolder?: () => void;
  onOpenLaunchParams?: () => void;
  onUpdateModpack?: () => void;
}


export function SettingsDialog({
  config,
  modpackStatus,
  onDisableAllMods,
  onEnableAllMods,
  onResetInstallation,
  onOpenFolder,
  onChangeConfig,
  onImportLocalMod,
  onExportProfile,
  onImportModpack,
  onExportModpack,
  onCleanModCache,
  onCopyLog,
  onCopyTroubleshooting,
  onCompatibilityCheck,
  onDependencyCheck,
  onOpenLogFolder,
  onOpenLaunchParams,
  onUpdateModpack,
}: SettingsDialogProps) {
  const [dataFolder, setDataFolder] = useState("");
  const [profileFolder, setProfileFolder] = useState("");
  const [steamFolder, setSteamFolder] = useState("");
  const [tf2Folder, setTf2Folder] = useState("");

  useEffect(() => {
    setDataFolder(config?.dataPath ?? "");
    setProfileFolder(config?.profilePath ?? "");
    setSteamFolder(config?.steamPath ?? "");
    setTf2Folder(config?.tf2Path ?? "");
  }, [config]);

  const handleBrowseFolder = (path: string | undefined, label: string) => {
    onOpenFolder?.(path, label);
  };

  const handleChangeFolder = (
    key: "dataPath" | "profilePath" | "steamPath" | "tf2Path",
    label: string,
    currentValue: string,
    setter: (value: string) => void
  ) => {
    const nextValue = window.prompt(`Set ${label} path`, currentValue || "");
    if (!nextValue || nextValue.trim().length === 0 || nextValue === currentValue) {
      return;
    }
    setter(nextValue);
    onChangeConfig?.({ [key]: nextValue });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="border-border hover:border-primary/50 hover:bg-primary/5"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Settings className="w-5 h-5 text-primary" />
            Project-P1L0T Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your mod manager and game settings
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Folder Settings */}
            <div className="space-y-4">
              <h3 className="text-sm text-primary flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Folder Configuration
              </h3>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="data-folder" className="text-muted-foreground text-sm">Data Folder</Label>
                  <div className="flex gap-2">
                    <Input
                      id="data-folder"
                      value={dataFolder}
                      className="flex-1 bg-secondary border-border text-sm"
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleBrowseFolder(dataFolder, "Data Folder")}
                      className="shrink-0 border-border hover:border-primary/50"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleChangeFolder("dataPath", "Data Folder", dataFolder, setDataFolder)
                      }
                      className="border-border hover:border-primary/50"
                    >
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-folder" className="text-muted-foreground text-sm">Profile Folder</Label>
                  <div className="flex gap-2">
                    <Input
                      id="profile-folder"
                      value={profileFolder}
                      className="flex-1 bg-secondary border-border text-sm"
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleBrowseFolder(profileFolder, "Profile Folder")}
                      className="shrink-0 border-border hover:border-primary/50"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleChangeFolder("profilePath", "Profile Folder", profileFolder, setProfileFolder)
                      }
                      className="border-border hover:border-primary/50"
                    >
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="steam-folder" className="text-muted-foreground text-sm">Steam Folder</Label>
                  <div className="flex gap-2">
                    <Input
                      id="steam-folder"
                      value={steamFolder}
                      className="flex-1 bg-secondary border-border text-sm"
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleBrowseFolder(steamFolder, "Steam Folder")}
                      className="shrink-0 border-border hover:border-primary/50"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleChangeFolder("steamPath", "Steam Folder", steamFolder, setSteamFolder)
                      }
                      className="border-border hover:border-primary/50"
                    >
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tf2-folder" className="text-muted-foreground text-sm">Titanfall 2 Folder</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tf2-folder"
                      value={tf2Folder}
                      className="flex-1 bg-secondary border-border text-sm"
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleBrowseFolder(tf2Folder, "Titanfall 2 Folder")}
                      className="shrink-0 border-border hover:border-primary/50"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleChangeFolder("tf2Path", "Titanfall 2 Folder", tf2Folder, setTf2Folder)
                      }
                      className="border-border hover:border-primary/50"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Mod Management */}
            <div className="space-y-4">
              <h3 className="text-sm text-primary flex items-center gap-2">
                <Package className="w-4 h-4" />
                Mod Management
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={onEnableAllMods}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <ToggleRight className="w-4 h-4 mr-2" />
                  Enable All Mods
                </Button>

                <Button
                  variant="outline"
                  onClick={onDisableAllMods}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <ToggleLeft className="w-4 h-4 mr-2" />
                  Disable All Mods
                </Button>

                <Button
                  variant="outline"
                  onClick={onImportLocalMod}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Local Mod
                </Button>

                <Button
                  variant="outline"
                  onClick={onExportProfile}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Profile
                </Button>

                <Button
                  variant="outline"
                  onClick={onDependencyCheck}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Dependency Check
                </Button>

                <Button
                  variant="outline"
                  onClick={onOpenLaunchParams}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Launch Parameters
                </Button>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Maintenance */}
            <div className="space-y-4">
              <h3 className="text-sm text-primary flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Maintenance & Troubleshooting
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={onCleanModCache}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean Mod Cache
                </Button>

                <Button
                  variant="outline"
                  onClick={onCopyLog}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Log File
                </Button>

                <Button
                  variant="outline"
                  onClick={onOpenLogFolder}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Open Log Folder
                </Button>

                <Button
                  variant="outline"
                  onClick={onCopyTroubleshooting}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Copy Troubleshooting Info
                </Button>

                <Button
                  variant="outline"
                  onClick={onCompatibilityCheck}
                  className="justify-start col-span-2 border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Check for Compatibility Issues
                </Button>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Modpack Management */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Modpack Management
              </h3>

              <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                <div className="space-y-1">
                  <div>
                    Installed: {modpackStatus?.currentVersion || (modpackStatus?.installed ? "Unknown" : "Not installed")}
                  </div>
                  <div>Latest: {modpackStatus?.latestVersion || "Unknown"}</div>
                  {modpackStatus?.updateAvailable && (
                    <div className="text-[#4da8da]">Update available</div>
                  )}
                  {modpackStatus?.latestError && (
                    <div className="text-destructive">Update check failed</div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={onUpdateModpack}
                  className="border-border hover:border-[#4da8da]/50 hover:bg-[#4da8da]/5"
                  disabled={!onUpdateModpack}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {modpackStatus?.installed ? "Update Modpack" : "Install Modpack"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={onImportModpack}
                  className="justify-start border-border hover:border-[#4da8da]/50 hover:bg-[#4da8da]/5 hover:text-[#4da8da]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import Modpack
                </Button>

                <Button
                  variant="outline"
                  onClick={onExportModpack}
                  className="justify-start border-border hover:border-primary/50 hover:bg-primary/5"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Export Modpack
                </Button>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Dangerous Actions */}
            <div className="space-y-4">
              <h3 className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Dangerous Actions
              </h3>

              <Button
                variant="outline"
                onClick={onResetInstallation}
                className="w-full justify-start border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Titanfall 2 Installation
              </Button>

              <p className="text-xs text-muted-foreground">
                This will remove all mods and restore the game to its original state. Use with caution.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
