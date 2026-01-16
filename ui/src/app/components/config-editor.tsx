import { useEffect, useState } from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Save, RotateCcw, FileCode } from "lucide-react";

interface ConfigEditorProps {
  initialConfig?: string;
  onSave?: (config: string) => void;
}

const defaultConfigTemplate = `// Titanfall 2 Configuration
{
  "game": {
    "resolution": "1920x1080",
    "fullscreen": true,
    "vsync": false,
    "fov": 90
  },
  "graphics": {
    "texture_quality": "high",
    "shadow_quality": "medium",
    "effects_quality": "high",
    "anti_aliasing": "TSAA"
  },
  "audio": {
    "master_volume": 0.8,
    "music_volume": 0.6,
    "sfx_volume": 0.9
  },
  "mods": {
    "auto_load": true,
    "safe_mode": false
  }
}`;

export function ConfigEditor({ initialConfig = "", onSave }: ConfigEditorProps) {
  const resolvedInitial = initialConfig.trim().length > 0 ? initialConfig : defaultConfigTemplate;
  const [config, setConfig] = useState(resolvedInitial);

  useEffect(() => {
    setConfig(resolvedInitial);
  }, [resolvedInitial]);

  const handleSave = () => {
    onSave?.(config);
  };

  const handleReset = () => {
    setConfig(resolvedInitial);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FileCode className="w-5 h-5 text-primary" />
        <span className="text-sm">Edit your game configuration</span>
      </div>

      <Textarea
        value={config}
        onChange={(e) => setConfig(e.target.value)}
        className="min-h-[400px] font-mono text-sm bg-secondary border-border focus:border-primary transition-colors"
        placeholder="Enter configuration..."
      />

      <div className="flex gap-2">
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Save className="w-4 h-4 mr-2" />
          Save Config
        </Button>
        <Button onClick={handleReset} variant="outline" className="border-border hover:border-primary/50">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
