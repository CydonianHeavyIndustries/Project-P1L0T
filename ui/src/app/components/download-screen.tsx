import { motion } from "motion/react";
import { Progress } from "./ui/progress";
import { Download, HardDrive, Wifi, Clock } from "lucide-react";

interface DownloadScreenProps {
  open: boolean;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBps: number;
  phase?: string;
  message?: string;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
    return "Calculating...";
  }
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  }
  return `${minutes}m ${secs}s`;
}

export function DownloadScreen({
  open,
  progress,
  downloadedBytes,
  totalBytes,
  speedBps,
  phase = "idle",
  message = "",
}: DownloadScreenProps) {
  if (!open) return null;

  const clampedProgress = Math.max(0, Math.min(progress, 100));
  const speedMbps = speedBps > 0 ? speedBps / (1024 * 1024) : 0;
  const remainingSeconds =
    speedBps > 0 && totalBytes > 0 ? (totalBytes - downloadedBytes) / speedBps : null;

  const stages = [
    { key: "checking", label: "Checking GitHub release" },
    { key: "download", label: "Downloading modpack archive" },
    { key: "finalizing", label: "Preparing installation" },
  ];

  const activeStageIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.key === phase)
  );

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(77, 168, 218, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(77, 168, 218, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Data Flow Lines */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-[#4da8da]/30 to-transparent"
            style={{
              top: `${20 + i * 15}%`,
              width: "100%",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-[700px] bg-card border-2 border-[#4da8da]/30 rounded-lg shadow-2xl shadow-[#4da8da]/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4da8da]/10 to-transparent border-b border-border p-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Download className="w-6 h-6 text-[#4da8da]" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-foreground">DOWNLOADING MODPACK</h2>
              <p className="text-sm text-muted-foreground">
                {message || "Syncing Project-P1L0T content..."}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Download Progress</span>
              <span className="text-[#4da8da] font-mono font-bold">{clampedProgress.toFixed(1)}%</span>
            </div>

            <div className="relative">
              <Progress value={clampedProgress} className="h-4 bg-secondary" />

              {/* Animated Data Flow */}
              {clampedProgress < 100 && (
                <motion.div
                  className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-transparent via-[#4da8da]/60 to-transparent pointer-events-none"
                  animate={{ x: ["-100%", "800%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
              </span>
              <span>Time remaining: {formatDuration(remainingSeconds)}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-4 h-4 text-[#4da8da]" />
                <span className="text-xs text-muted-foreground">Download Speed</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {speedMbps > 0 ? speedMbps.toFixed(1) : "--"}
                <span className="text-sm text-muted-foreground ml-1">MB/s</span>
              </div>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-[#4da8da]" />
                <span className="text-xs text-muted-foreground">Download Size</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {formatBytes(totalBytes || downloadedBytes)}
              </div>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#4da8da]" />
                <span className="text-xs text-muted-foreground">Remaining</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {formatDuration(remainingSeconds)}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-2 font-mono text-xs">
            {stages.map((stage, index) => (
              <div key={stage.key} className="flex items-center gap-2">
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    index <= activeStageIndex ? "bg-[#4da8da]" : "bg-muted-foreground"
                  }`}
                  animate={
                    index === activeStageIndex
                      ? { opacity: [1, 0.3, 1] }
                      : { opacity: 0.6 }
                  }
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-muted-foreground">{stage.label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
