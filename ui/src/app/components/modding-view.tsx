import { useState } from "react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { ModItem, type Mod } from "./mod-item";
import { ConfigEditor } from "./config-editor";
import { LaunchParamsEditor } from "./launch-params-editor";
import { 
  ShieldCheck, 
  Hammer, 
  Upload, 
  Search,
  Package,
} from "lucide-react";
import { motion } from "motion/react";

interface ModdingViewProps {
  mods: Mod[];
  onToggleMod: (id: string) => void;
  onDeleteMod: (id: string) => void;
  onVerifyFiles: () => void;
  onCompileFiles: () => void;
  onImportMod: () => void;
  isProcessing: boolean;
  enabledModsCount: number;
  configText: string;
  launchParams: string[];
  onSaveConfig: (config: string) => void;
  onUpdateLaunchParams: (params: string[]) => void;
  activeTab: "mods" | "config" | "launch-params";
  onTabChange: (tab: "mods" | "config" | "launch-params") => void;
}

export function ModdingView({
  mods,
  onToggleMod,
  onDeleteMod,
  onVerifyFiles,
  onCompileFiles,
  onImportMod,
  isProcessing,
  enabledModsCount,
  configText,
  launchParams,
  onSaveConfig,
  onUpdateLaunchParams,
  activeTab,
  onTabChange,
}: ModdingViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMods = mods.filter((mod) =>
    mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mod.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mod.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Modding Header */}
      <div className="bg-card/50 border border-primary/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Mod Management</h2>
            <p className="text-sm text-muted-foreground">
              {enabledModsCount} of {mods.length} mods currently active
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded border border-[#4da8da]/20">
            <Package className="w-4 h-4 text-[#4da8da]" />
            <span>{enabledModsCount} / {mods.length} mods active</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onVerifyFiles}
            disabled={isProcessing}
            variant="outline"
            className="w-full h-16 border-border hover:border-[#4da8da]/50 hover:bg-[#4da8da]/5 hover:text-[#4da8da]"
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            Verify Files
          </Button>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onCompileFiles}
            disabled={isProcessing}
            variant="outline"
            className="w-full h-16 border-border hover:border-primary/50 hover:bg-primary/5"
          >
            <Hammer className="w-5 h-5 mr-2" />
            Compile Files
          </Button>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onImportMod}
            disabled={isProcessing}
            variant="outline"
            className="w-full h-16 border-border hover:border-[#4da8da]/50 hover:bg-[#4da8da]/5 hover:text-[#4da8da]"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import Mod
          </Button>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "mods" | "config" | "launch-params")} className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger 
            value="mods" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Installed Mods
          </TabsTrigger>
          <TabsTrigger 
            value="config"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Config Editor
          </TabsTrigger>
          <TabsTrigger 
            value="launch-params"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Launch Parameters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mods" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search mods by name, author, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border focus:border-primary transition-colors"
            />
          </div>

          {/* Mod List */}
          <ScrollArea className="h-[600px] rounded border border-border">
            <div className="p-4 space-y-3">
              {filteredMods.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No mods found matching your search
                </div>
              ) : (
                filteredMods.map((mod) => (
                  <ModItem
                    key={mod.id}
                    mod={mod}
                    onToggle={onToggleMod}
                    onDelete={onDeleteMod}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="config">
          <div className="bg-card border border-border rounded p-6">
            <ConfigEditor initialConfig={configText} onSave={onSaveConfig} />
          </div>
        </TabsContent>

        <TabsContent value="launch-params">
          <div className="bg-card border border-border rounded p-6">
            <LaunchParamsEditor initialParams={launchParams} onUpdate={onUpdateLaunchParams} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
