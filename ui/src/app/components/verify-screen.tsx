import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface VerifyScreenProps {
  open: boolean;
  logs?: string[];
  progress?: number;
}

export function VerifyScreen({ open, logs = [], progress = 0 }: VerifyScreenProps) {
  const displayLogs = logs.length > 0 ? logs : ["[INFO] Waiting for verification output..."];
  const clampedProgress = Math.max(0, Math.min(progress, 100));

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-2xl bg-card border-2 border-[#4da8da]/30 shadow-2xl shadow-[#4da8da]/20"
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ShieldCheck className="w-6 h-6 text-[#4da8da]" />
            </motion.div>
            <span className="text-xl">VERIFYING GAME FILES</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Checking integrity of Titanfall 2 installation...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Logs */}
          <div className="relative">
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
            <ScrollArea className="h-[200px] bg-secondary/50 border border-border rounded p-3">
              <div className="space-y-1 font-mono text-xs">
                {displayLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`${
                      log.includes("[OK]") || log.includes("[COMPLETE]")
                        ? "text-green-400"
                        : log.includes("[ERROR]") || log.includes("[FAIL]")
                        ? "text-destructive"
                        : log.includes("[CHECK]")
                        ? "text-[#4da8da]"
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

          {/* Loading Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verification Progress</span>
              <span className="text-[#4da8da] font-mono">{clampedProgress}%</span>
            </div>
            
            <div className="relative overflow-hidden rounded-full">
              <Progress value={clampedProgress} className="h-3" />
              
              {/* Animated scanner line */}
              {clampedProgress < 100 && (
                <motion.div
                  className="absolute top-0 left-0 h-full w-16 bg-gradient-to-r from-transparent via-[#4da8da]/80 to-transparent pointer-events-none"
                  animate={{ x: ["-100%", "calc(100% + 4rem)"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-[#4da8da]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span>SCANNING FILES</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
                <span>INTEGRITY CHECK</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
