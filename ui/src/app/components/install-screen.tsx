import { motion } from "motion/react";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { CheckCircle2, Loader2, Package, Cog } from "lucide-react";

interface InstallScreenProps {
  open: boolean;
  progress: number;
  phase?: string;
  logs?: string[];
  message?: string;
}

const installSteps = [
  { key: "extract", name: "Extracting modpack files", icon: Package },
  { key: "finalizing", name: "Finalizing modpack setup", icon: Cog },
  { key: "complete", name: "Modpack ready", icon: CheckCircle2 },
];

const phaseOrder: Record<string, number> = {
  extract: 0,
  finalizing: 1,
  complete: 2,
};

export function InstallScreen({ open, progress, phase = "extract", logs = [], message }: InstallScreenProps) {
  if (!open) return null;

  const currentIndex = phaseOrder[phase] ?? 0;
  const clampedProgress = Math.max(0, Math.min(progress, 100));
  const displayLogs = logs.length ? logs : ["[INFO] Preparing modpack installation..."];

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255, 107, 53, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 107, 53, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Install Pulse Effect */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-[800px] bg-card border-2 border-primary/30 rounded-lg shadow-2xl shadow-primary/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border p-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-6 h-6 text-primary" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-foreground">INSTALLING MODPACK</h2>
              <p className="text-sm text-muted-foreground">{message || "Applying Project-P1L0T updates..."}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Installation Steps */}
          <div className="space-y-3">
            {installSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded border transition-all ${
                    isCompleted
                      ? "bg-green-500/10 border-green-500/30"
                      : isCurrent
                      ? "bg-primary/10 border-primary/30"
                      : "bg-secondary/30 border-border"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-5 h-5 text-primary flex-shrink-0" />
                    </motion.div>
                  ) : (
                    <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isCompleted
                        ? "text-green-400"
                        : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="text-primary font-mono font-bold">{clampedProgress.toFixed(0)}%</span>
            </div>

            <div className="relative overflow-hidden rounded-full">
              <Progress value={clampedProgress} className="h-3" />

              {/* Animated Scanner */}
              {clampedProgress < 100 && (
                <motion.div
                  className="absolute top-0 left-0 h-full w-16 bg-gradient-to-r from-transparent via-primary/80 to-transparent pointer-events-none"
                  animate={{ x: ["-100%", "calc(100% + 4rem)"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>
          </div>

          {/* Installation Logs */}
          <div className="relative">
            <div className="mb-2 text-xs text-muted-foreground font-medium">INSTALLATION LOG</div>
            <div className="absolute top-8 left-0 w-full h-8 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
            <ScrollArea className="h-[200px] bg-secondary/50 border border-border rounded p-3">
              <div className="space-y-1 font-mono text-xs">
                {displayLogs.map((log, index) => (
                  <motion.div
                    key={`${log}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`${
                      log.includes("[OK]") || log.includes("[COMPLETE]")
                        ? "text-green-400"
                        : log.includes("[ERROR]")
                        ? "text-destructive"
                        : log.includes("[DOWNLOAD]")
                        ? "text-[#4da8da]"
                        : log.includes("[EXTRACT]")
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {log}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
            <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          </div>

          {/* Status Indicators */}
          <div className="flex items-center justify-center gap-8 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-muted-foreground font-mono">INSTALLING</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                className="w-2 h-2 rounded-full bg-[#4da8da]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              <span className="text-muted-foreground font-mono">EXTRACTING</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
              />
              <span className="text-muted-foreground font-mono">VERIFYING</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
