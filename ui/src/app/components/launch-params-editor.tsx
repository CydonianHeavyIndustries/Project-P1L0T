import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, X, Terminal } from "lucide-react";

interface LaunchParamsEditorProps {
  initialParams?: string[];
  onUpdate?: (params: string[]) => void;
}

export function LaunchParamsEditor({ initialParams = [], onUpdate }: LaunchParamsEditorProps) {
  const resolvedInitial =
    initialParams.length > 0
      ? initialParams
      : ["-novid", "-high", "-fullscreen", "+fps_max 144"];
  const [params, setParams] = useState<string[]>(resolvedInitial);
  const [newParam, setNewParam] = useState("");

  useEffect(() => {
    setParams(resolvedInitial);
  }, [resolvedInitial]);

  const handleAdd = () => {
    if (newParam.trim() && !params.includes(newParam.trim())) {
      const updated = [...params, newParam.trim()];
      setParams(updated);
      onUpdate?.(updated);
      setNewParam("");
    }
  };

  const handleRemove = (paramToRemove: string) => {
    const updated = params.filter((p) => p !== paramToRemove);
    setParams(updated);
    onUpdate?.(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Terminal className="w-5 h-5 text-primary" />
        <span className="text-sm">Configure launch parameters</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={newParam}
          onChange={(e) => setNewParam(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add launch parameter (e.g., -novid)"
          className="flex-1 bg-secondary border-border focus:border-primary transition-colors"
        />
        <Button 
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="bg-secondary border border-border p-4 rounded min-h-[200px]">
        {params.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
            No launch parameters configured
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {params.map((param) => (
              <Badge
                key={param}
                variant="outline"
                className="px-3 py-1.5 text-sm border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10 group"
              >
                <span className="font-mono">{param}</span>
                <button
                  onClick={() => handleRemove(param)}
                  className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="bg-muted/50 border border-border p-3 rounded">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary">Command Preview:</span> Titanfall2.exe {params.join(" ")}
        </p>
      </div>
    </div>
  );
}
