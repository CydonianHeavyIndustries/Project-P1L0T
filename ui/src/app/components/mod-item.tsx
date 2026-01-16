import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Trash2, Package, AlertCircle } from "lucide-react";

export interface Mod {
  id: string;
  name: string;
  version: string;
  author: string;
  enabled: boolean;
  description: string;
}

interface ModItemProps {
  mod: Mod;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ModItem({ mod, onToggle, onDelete }: ModItemProps) {
  return (
    <div className="group relative bg-card border border-border p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1">
            <Package className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-foreground truncate">{mod.name}</h3>
              <span className="text-xs text-muted-foreground shrink-0">v{mod.version}</span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {mod.description}
            </p>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>by {mod.author}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={mod.enabled}
            onCheckedChange={() => onToggle(mod.id)}
            className="data-[state=checked]:bg-primary"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(mod.id)}
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
