import { useEffect, useRef, useState } from "react";

import { Button } from "./components/ui/button";

import { SettingsDialog } from "./components/settings-dialog";

import { InitialLoadingScreen } from "./components/initial-loading-screen";

import { LoadingScreen } from "./components/loading-screen";

import { VerifyScreen } from "./components/verify-screen";

import { CompileScreen } from "./components/compile-screen";

import { DownloadScreen } from "./components/download-screen";

import { InstallScreen } from "./components/install-screen";

import { ConfirmDialog } from "./components/confirm-dialog";

import { MainLauncher } from "./components/main-launcher";

import { ModdingView } from "./components/modding-view";

import { type Mod } from "./components/mod-item";

import {

  X,

  Mail,

  User,

  Wrench,

  Home,

  Package,

} from "lucide-react";

import { toast } from "sonner";

import { Toaster } from "./components/ui/sonner";

import { motion, AnimatePresence } from "motion/react";

import logoImage from "../assets/project-p1lot-logo.png";

import { Separator } from "./components/ui/separator";



interface LauncherConfig {

  dataPath: string;

  profilePath: string;

  steamPath: string;

  tf2Path: string;

  gamePath: string;

  launcherExe: string;

  configFilePath?: string;

  launchParams?: string[];

}



interface ApiResult<T> {

  ok: boolean;

  status: number;

  data: T;

}

interface ModpackState {
  status: string;
  phase: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBps: number;
  message: string;
  error: string | null;
  updatedAt: string | null;
}

interface ModpackStatus {
  installed: boolean;
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  latestError?: string | null;
  modpackRoot?: string;
  status?: ModpackState;
}

type ActiveTask = "launch" | "verify" | "compile" | null;



function App() {

  const [showInitialLoading, setShowInitialLoading] = useState(true);

  const [currentView, setCurrentView] = useState<"launcher" | "modding">("launcher");

  const [moddingTab, setModdingTab] = useState<"mods" | "config" | "launch-params">("mods");

  const [mods, setMods] = useState<Mod[]>([]);

  const [config, setConfig] = useState<LauncherConfig | null>(null);

  const [configText, setConfigText] = useState("");

  const [launchParams, setLaunchParams] = useState<string[]>([]);
  const [modpackStatus, setModpackStatus] = useState<ModpackStatus | null>(null);
  const [modpackState, setModpackState] = useState<ModpackState | null>(null);
  const [modpackLogs, setModpackLogs] = useState<string[]>([]);
  const [modpackPolling, setModpackPolling] = useState(false);
  const [modpackInstallTriggered, setModpackInstallTriggered] = useState(false);
  const modpackLastMessageRef = useRef<string | null>(null);
  const modpackLastStatusRef = useRef<string | null>(null);


  const [activeTask, setActiveTask] = useState<ActiveTask>(null);



  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  const [showVerifyScreen, setShowVerifyScreen] = useState(false);

  const [showCompileScreen, setShowCompileScreen] = useState(false);

  const [showDownloadScreen, setShowDownloadScreen] = useState(false);

  const [showInstallScreen, setShowInstallScreen] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);



  const [serverLogs, setServerLogs] = useState<string[]>([]);

  const [launchNotes, setLaunchNotes] = useState<string[]>([]);

  const [verifyNotes, setVerifyNotes] = useState<string[]>([]);

  const [compileNotes, setCompileNotes] = useState<string[]>([]);

  const [loadingProgress, setLoadingProgress] = useState(0);

  const [verifyProgress, setVerifyProgress] = useState(0);

  const [compileProgress, setCompileProgress] = useState(0);



  const enabledModsCount = mods.filter((m) => m.enabled).length;

  const isProcessing = activeTask !== null;



  const handleInitialLoadingComplete = () => {

    setShowInitialLoading(false);

  };



  const requestJson = async <T,>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> => {

    const response = await fetch(path, {

      ...options,

      headers: {

        "Content-Type": "application/json",

        ...(options.headers || {}),

      },

    });

    const data = (await response.json().catch(() => ({}))) as T;

    return { ok: response.ok, status: response.status, data };

  };



  const refreshMods = async () => {

    const result = await requestJson<{ mods: Mod[] }>("/api/mods");

    if (result.ok && Array.isArray(result.data.mods)) {

      setMods(result.data.mods);

      return true;

    }

    toast.error("Failed to load mods", {

      description: (result.data as { error?: string }).error || "Check launcher logs",

    });

    return false;

  };



  const refreshConfig = async () => {

    const [configResult, configTextResult, paramsResult] = await Promise.all([

      requestJson<{ config: LauncherConfig }>("/api/config"),

      requestJson<{ text: string }>("/api/config-text"),

      requestJson<{ params: string[] }>("/api/launch-params"),

    ]);



    if (configResult.ok) {

      setConfig(configResult.data.config);

    }

    if (configTextResult.ok) {

      setConfigText(configTextResult.data.text || "");

    }

    if (paramsResult.ok) {

      setLaunchParams(Array.isArray(paramsResult.data.params) ? paramsResult.data.params : []);

    }



    if (!configResult.ok || !configTextResult.ok || !paramsResult.ok) {

      toast.error("Failed to load launcher settings", {

        description: "Check launcher logs for details",

      });

    }

  };

  const refreshModpackStatus = async (refreshLatest = false) => {
    const suffix = refreshLatest ? "?refresh=1" : "";
    const result = await requestJson<ModpackStatus>(`/api/modpack/status${suffix}`);
    if (result.ok) {
      setModpackStatus(result.data);
      if (result.data.status) {
        setModpackState(result.data.status);
        if (result.data.status.status === "running") {
          setModpackPolling(true);
        }
      }
      return result.data;
    }
    toast.error("Failed to load modpack status", {
      description: "Check launcher logs for details",
    });
    return null;
  };

  const startModpackInstall = async (force: boolean) => {
    setModpackLogs([]);
    const endpoint = force ? "/api/modpack/update" : "/api/modpack/install";
    const result = await requestJson<{ ok?: boolean; error?: string; status?: ModpackState }>(endpoint, {
      method: "POST",
    });

    if (result.ok) {
      if (result.data.status) {
        setModpackState(result.data.status);
      }
      setModpackPolling(true);
      toast.info(force ? "Updating modpack" : "Installing modpack", {
        description: "Syncing the latest Project-P1L0T files",
      });
      return true;
    }

    if (result.status === 409 && result.data && (result.data as { status?: ModpackState }).status) {
      setModpackState((result.data as { status?: ModpackState }).status || null);
      setModpackPolling(true);
      return true;
    }

    toast.error("Modpack update failed", {
      description: (result.data as { error?: string }).error || "Check launcher logs",
    });
    return false;
  };




  useEffect(() => {

    const loadInitial = async () => {

      const modpack = await refreshModpackStatus(true);

      await refreshConfig();

      if (modpack?.installed) {

        await refreshMods();

      }

    };



    loadInitial();

  }, []);

  useEffect(() => {
    if (!modpackStatus || modpackInstallTriggered) {
      return;
    }
    if (!modpackStatus.installed) {
      setModpackInstallTriggered(true);
      startModpackInstall(false);
    }
  }, [modpackStatus, modpackInstallTriggered]);

  useEffect(() => {
    if (!modpackPolling) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const result = await requestJson<{ status?: ModpackState }>("/api/modpack/progress");
      if (!cancelled && result.ok && result.data.status) {
        setModpackState(result.data.status);
        if (result.data.status.status !== "running") {
          setModpackPolling(false);
          const modpack = await refreshModpackStatus(true);

          if (modpack?.installed) {

            await refreshMods();

          }
          return;
        }
      }
      if (!cancelled) {
        setTimeout(poll, 1000);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [modpackPolling]);

  useEffect(() => {
    const message = modpackState?.message?.trim();
    if (!message || modpackLastMessageRef.current === message) {
      return;
    }
    modpackLastMessageRef.current = message;
    const phaseLabel = modpackState?.phase ? modpackState.phase.toUpperCase() : "MODPACK";
    setModpackLogs((prev) => [...prev, `[${phaseLabel}] ${message}`].slice(-80));
  }, [modpackState?.message]);

  useEffect(() => {
    if (!modpackState || modpackLastStatusRef.current === modpackState.status) {
      return;
    }
    modpackLastStatusRef.current = modpackState.status;
    if (modpackState.status === "complete") {
      toast.success("Modpack ready", {
        description: "Latest Project-P1L0T modpack installed",
      });
    } else if (modpackState.status === "error") {
      toast.error("Modpack update failed", {
        description: modpackState.error || "Check launcher logs",
      });
    }
  }, [modpackState?.status, modpackState?.error]);

  useEffect(() => {
    if (!modpackState || modpackState.status !== "running") {
      setShowDownloadScreen(false);
      setShowInstallScreen(false);
      return;
    }
    const phase = modpackState.phase;
    if (phase === "checking" || phase === "download") {
      setShowDownloadScreen(true);
      setShowInstallScreen(false);
    } else if (phase === "extract" || phase === "finalizing") {
      setShowDownloadScreen(false);
      setShowInstallScreen(true);
    }
  }, [modpackState?.phase, modpackState?.status]);




  useEffect(() => {

    const shouldPoll = showLoadingScreen || showVerifyScreen || showCompileScreen;

    if (!shouldPoll) {

      setServerLogs([]);

      return;

    }



    let cancelled = false;



    const poll = async () => {
      try {
        const response = await fetch("/api/logs/server?tail=400");
        if (response.ok) {
          const data = (await response.json()) as { log?: string };
          const lines = (data.log || "").split(/\r?\n/).filter(Boolean);
          if (!cancelled && lines.length) {
            setServerLogs(lines);
          }
        }
      } catch (_error) {
        if (!cancelled) {
          setServerLogs((prev) => (prev.length ? prev : ["[WARN] Unable to read launcher logs"]));
        }
      }

      if (!cancelled) {
        setTimeout(poll, 900);
      }
    };


    poll();



    return () => {

      cancelled = true;

    };

  }, [showLoadingScreen, showVerifyScreen, showCompileScreen]);



  useEffect(() => {

    if (!showLoadingScreen) {

      setLoadingProgress(0);

      setLaunchNotes([]);

      return;

    }



    setLoadingProgress(5);

    const interval = setInterval(() => {
      setLoadingProgress((prev) => (prev >= 95 ? prev : Math.min(prev + 3, 95)));
    }, 450);


    return () => clearInterval(interval);

  }, [showLoadingScreen]);



  useEffect(() => {

    if (!showVerifyScreen) {

      setVerifyProgress(0);

      setVerifyNotes([]);

      return;

    }



    setVerifyProgress(5);

    const interval = setInterval(() => {
      setVerifyProgress((prev) => (prev >= 95 ? prev : Math.min(prev + 2, 95)));
    }, 600);


    return () => clearInterval(interval);

  }, [showVerifyScreen]);



  useEffect(() => {

    if (!showCompileScreen) {

      setCompileProgress(0);

      setCompileNotes([]);

      return;

    }



    setCompileProgress(5);

    const interval = setInterval(() => {
      setCompileProgress((prev) => (prev >= 95 ? prev : Math.min(prev + 2, 95)));
    }, 650);


    return () => clearInterval(interval);

  }, [showCompileScreen]);



  const finishWithDelay = async (minMs: number) => {

    await new Promise((resolve) => setTimeout(resolve, minMs));

  };



  const handleToggleMod = async (id: string) => {

    const result = await requestJson<{ mods: Mod[] }>(

      `/api/mods/${encodeURIComponent(id)}/toggle`,

      { method: "POST" }

    );

    if (result.ok && Array.isArray(result.data.mods)) {

      setMods(result.data.mods);

      const mod = result.data.mods.find((item) => item.id === id);

      if (mod) {

        toast.success(`${mod.name} ${mod.enabled ? "enabled" : "disabled"}`, {

          description: "Mod state updated successfully",

        });

      }

      return;

    }

    toast.error("Failed to toggle mod", {

      description: (result.data as { error?: string }).error || "Check launcher logs",

    });

  };



  const handleDeleteMod = async (id: string) => {

    const result = await requestJson<{ mods: Mod[] }>(`/api/mods/${encodeURIComponent(id)}`, {

      method: "DELETE",

    });

    if (result.ok && Array.isArray(result.data.mods)) {

      setMods(result.data.mods);

      toast.success(`${id} deleted`, {

        description: "Mod has been removed from your installation",

      });

      return;

    }

    toast.error("Failed to delete mod", {

      description: (result.data as { error?: string }).error || "Check launcher logs",

    });

  };



  const handleLaunchGame = async () => {

    if (isProcessing) {

      return;

    }

    setActiveTask("launch");

    setShowLoadingScreen(true);

    setLaunchNotes([]);



    const startedAt = Date.now();

    const result = await requestJson<{
      ok?: boolean;
      error?: string;
      logPath?: string;
      compileErrors?: string[];
      brokenMods?: string[];
      note?: string;
    }>("/api/launch", { method: "POST", body: JSON.stringify({ deferSignal: true }) });


    const notes: string[] = [];

    if (result.ok) {

      notes.push("[OK] Launch request submitted");

      if (result.data.logPath) {

        notes.push(`[LOG] ${result.data.logPath}`);

      }

      toast.success("Launch requested", {

        description: result.data.logPath || "Check logs for details",

      });

    } else {

      notes.push(`[ERROR] ${result.data.error || "Launch failed"}`);

      if (result.data.note) {

        notes.push(`[NOTE] ${result.data.note}`);

      }

      toast.error("Launch failed", {

        description: result.data.error || "Check launch logs",

      });

    }



    if (Array.isArray(result.data.compileErrors) && result.data.compileErrors.length > 0) {

      notes.push("[WARN] Compile errors detected:");

      result.data.compileErrors.forEach((item) => notes.push(`- ${item}`));

      toast.error("Compile errors detected", {

        description: result.data.compileErrors.slice(0, 3).join(" | "),

      });

    }



    if (Array.isArray(result.data.brokenMods) && result.data.brokenMods.length > 0) {

      notes.push("[WARN] Broken mods detected:");

      result.data.brokenMods.forEach((item) => notes.push(`- ${item}`));

    }



    setLaunchNotes(notes);

    setLoadingProgress(100);



    const elapsed = Date.now() - startedAt;

    if (elapsed < 2500) {

      await finishWithDelay(2500 - elapsed);

    } else {

      await finishWithDelay(500);

    }



    setShowLoadingScreen(false);
    await requestJson("/api/launch-signal", { method: "POST" });
    setActiveTask(null);
  };



  const handleVerifyFiles = async () => {

    if (isProcessing) {

      return;

    }

    setActiveTask("verify");

    setShowVerifyScreen(true);

    setVerifyNotes([]);



    const startedAt = Date.now();

    const result = await requestJson<{ ok?: boolean; issues?: string[]; error?: string }>("/api/verify", {

      method: "POST",

    });



    const notes: string[] = [];

    if (result.ok) {

      if (result.data.ok) {

        notes.push("[OK] Verification complete");

        toast.success("Verification complete", {

          description: "No issues detected",

        });

      } else {

        notes.push("[WARN] Verification issues found");

        (result.data.issues || []).forEach((issue) => notes.push(`- ${issue}`));

        toast.error("Verification issues found", {

          description: (result.data.issues || []).slice(0, 3).join(" | "),

        });

      }

    } else {

      notes.push(`[ERROR] ${result.data.error || "Verification failed"}`);

      toast.error("Verification failed", {

        description: result.data.error || "Check launcher logs",

      });

    }



    setVerifyNotes(notes);

    setVerifyProgress(100);



    const elapsed = Date.now() - startedAt;

    if (elapsed < 2500) {

      await finishWithDelay(2500 - elapsed);

    } else {

      await finishWithDelay(500);

    }



    setShowVerifyScreen(false);

    setActiveTask(null);

  };



  const handleCompileFiles = async () => {

    if (isProcessing) {

      return;

    }

    setActiveTask("compile");

    setShowCompileScreen(true);

    setCompileNotes([]);



    const startedAt = Date.now();

    const result = await requestJson<{

      ok?: boolean;

      summary?: string;

      tail?: string;

      quarantined?: string[];

      error?: string;

    }>("/api/compile", { method: "POST" });



    const notes: string[] = [];

    if (result.ok) {

      if (result.data.ok) {

        notes.push("[OK] Compile test passed");

        toast.success("Compile test passed", {

          description: result.data.summary || "Scripts compiled successfully",

        });

      } else {

        notes.push("[WARN] Compile test reported issues");

        if (result.data.summary) {

          notes.push(`[SUMMARY] ${result.data.summary}`);

        }

        toast.error("Compile test reported issues", {

          description: result.data.summary || "Check logs for details",

        });

      }

    } else {

      notes.push(`[ERROR] ${result.data.error || "Compile failed"}`);

      toast.error("Compile failed", {

        description: result.data.error || "Check launcher logs",

      });

    }



    if (result.data.quarantined && result.data.quarantined.length > 0) {

      notes.push("[WARN] Quarantined mods:");

      result.data.quarantined.forEach((item) => notes.push(`- ${item}`));

    }



    if (result.data.tail) {

      const tailLines = result.data.tail.split(/\r?\n/).filter(Boolean);

      notes.push("[LOG] Recent launcher output:");

      notes.push(...tailLines.slice(-20));

    }



    setCompileNotes(notes);

    setCompileProgress(100);



    const elapsed = Date.now() - startedAt;

    if (elapsed < 2500) {

      await finishWithDelay(2500 - elapsed);

    } else {

      await finishWithDelay(500);

    }



    setShowCompileScreen(false);

    setActiveTask(null);

  };



  const handleResetInstallation = async () => {

    const result = await requestJson<{ ok?: boolean; error?: string }>("/api/maintenance/reset-profile", {

      method: "POST",

    });

    if (result.ok) {

      toast.success("Installation reset", {

        description: "Titanfall 2 has been restored to vanilla state",

      });

      await refreshMods();

      return;

    }

    toast.error("Reset failed", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleImportMod = async () => {

    const path = window.prompt("Enter full path to a mod folder or .zip file");

    if (!path) {

      return;

    }

    const result = await requestJson<{ mods: Mod[]; error?: string }>("/api/import", {

      method: "POST",

      body: JSON.stringify({ path }),

    });

    if (result.ok && Array.isArray(result.data.mods)) {

      setMods(result.data.mods);

      toast.success("Mod imported", {

        description: path,

      });

      return;

    }

    toast.error("Import failed", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleImportModpack = async () => {

    const path = window.prompt("Enter folder or .zip path for bulk import");

    if (!path) {

      return;

    }

    const includeCosmetics = window.confirm("Include cosmetics? Click OK to include.");

    const result = await requestJson<{ mods: Mod[]; error?: string; imported?: unknown[]; skipped?: unknown[] }>(

      "/api/import-bulk",

      {

        method: "POST",

        body: JSON.stringify({ path, includeCosmetics }),

      }

    );

    if (result.ok && Array.isArray(result.data.mods)) {

      setMods(result.data.mods);

      toast.success("Bulk import complete", {

        description: `${(result.data.imported || []).length} imported, ${(result.data.skipped || []).length} skipped`,

      });

      return;

    }

    toast.error("Bulk import failed", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleCloseApp = async () => {

    await requestJson("/api/quit", { method: "POST" });

    window.close();

  };



  const handleDisableAllMods = async () => {

    const result = await requestJson<{ mods: Mod[]; error?: string }>("/api/mods/disable-all", {

      method: "POST",

    });

    if (result.ok && Array.isArray(result.data.mods)) {

      setMods(result.data.mods);

      toast.success("All mods disabled");

      return;

    }

    toast.error("Failed to disable mods", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleEnableAllMods = async () => {

    const result = await requestJson<{ mods: Mod[]; error?: string }>("/api/mods/enable-all", {

      method: "POST",

    });

    if (result.ok && Array.isArray(result.data.mods)) {

      setMods(result.data.mods);

      toast.success("All mods enabled");

      return;

    }

    toast.error("Failed to enable mods", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleUpdateConfig = async (next: Partial<LauncherConfig>) => {

    const result = await requestJson<{ config: LauncherConfig; error?: string }>("/api/config", {

      method: "PUT",

      body: JSON.stringify(next),

    });

    if (result.ok) {

      setConfig(result.data.config);

      toast.success("Settings updated", { description: "Configuration saved" });

      return;

    }

    toast.error("Failed to update settings", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleOpenFolder = async (path: string | undefined, label: string) => {

    if (!path) {

      toast.error(`${label} is not set`);

      return;

    }

    const result = await requestJson<{ ok?: boolean; error?: string }>("/api/open-folder", {

      method: "POST",

      body: JSON.stringify({ path }),

    });

    if (!result.ok) {

      toast.error("Failed to open folder", {

        description: result.data.error || path,

      });

    }

  };



  const handleCleanModCache = async () => {

    const result = await requestJson<{ ok?: boolean; error?: string }>("/api/maintenance/clear-cache", {

      method: "POST",

    });

    if (result.ok) {

      toast.success("Cache cleaned", { description: "Compiled cache cleared" });

      return;

    }

    toast.error("Cache cleanup failed", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleCopyLog = async () => {

    const result = await requestJson<{ log?: string; path?: string; error?: string }>("/api/logs/latest");

    if (result.ok && result.data.log) {

      await navigator.clipboard.writeText(result.data.log);

      toast.success("Log copied", { description: "Latest log copied to clipboard" });

      return;

    }

    if (result.ok && result.data.path) {

      await navigator.clipboard.writeText(result.data.path);

      toast.info("Log path copied", { description: result.data.path });

      return;

    }

    toast.error("No logs found", { description: "Check launcher logs" });

  };



  const handleCopyTroubleshooting = async () => {

    const result = await requestJson<{ ok?: boolean; path?: string; error?: string }>(

      "/api/maintenance/copy-troubleshoot",

      { method: "POST" }

    );

    if (result.ok && result.data.path) {

      await navigator.clipboard.writeText(result.data.path);

      toast.success("Troubleshooting saved", { description: result.data.path });

      return;

    }

    toast.error("Troubleshooting failed", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleCompatibilityCheck = async () => {

    const result = await requestJson<{ ok?: boolean; issues?: string[]; error?: string }>(

      "/api/compatibility",

      { method: "POST" }

    );

    if (result.ok) {

      if (result.data.ok) {

        toast.success("Compatibility check passed", { description: "No conflicts detected" });

      } else {

        toast.error("Compatibility issues found", {

          description: (result.data.issues || []).slice(0, 3).join(" | "),

        });

      }

      return;

    }

    toast.error("Compatibility check failed", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleDependencyCheck = async () => {

    const result = await requestJson<{ ok?: boolean; missing?: string[]; error?: string }>(

      "/api/maintenance/dependency-check",

      { method: "POST" }

    );

    if (result.ok) {

      if (result.data.missing && result.data.missing.length > 0) {

        toast.error("Missing dependencies", {

          description: result.data.missing.slice(0, 3).join(" | "),

        });

      } else {

        toast.success("Dependencies satisfied", { description: "All required mods found" });

      }

      return;

    }

    toast.error("Dependency check failed", {

      description: result.data.error || "Check launcher logs",

    });

  };



  const handleExportProfile = async () => {

    const result = await requestJson<{ ok?: boolean; path?: string; error?: string }>(

      "/api/export-profile",

      { method: "POST" }

    );

    if (result.ok && result.data.path) {

      await navigator.clipboard.writeText(result.data.path);

      toast.success("Profile exported", { description: result.data.path });

      return;

    }

    toast.error("Export failed", { description: result.data.error || "Check launcher logs" });

  };



  const handleOpenLogFolder = async () => {

    const logFolder = config?.profilePath

      ? `${config.profilePath}\\R2Northstar\\logs`

      : undefined;

    await handleOpenFolder(logFolder, "Log folder");

  };



  const handleSaveConfigText = async (text: string) => {

    const result = await requestJson<{ ok?: boolean; error?: string }>("/api/config-text", {

      method: "PUT",

      body: JSON.stringify({ text }),

    });

    if (result.ok) {

      setConfigText(text);

      toast.success("Configuration saved", { description: "Settings updated" });

      return;

    }

    toast.error("Failed to save config", { description: result.data.error || "Check launcher logs" });

  };



  const handleUpdateLaunchParams = async (params: string[]) => {

    const result = await requestJson<{ ok?: boolean; error?: string }>("/api/launch-params", {

      method: "PUT",

      body: JSON.stringify({ params }),

    });

    if (result.ok) {

      setLaunchParams(params);

      toast.success("Launch parameters updated", {

        description: `${params.length} parameters configured`,

      });

      return;

    }

    toast.error("Failed to update launch params", {

      description: result.data.error || "Check launcher logs",

    });

  };

  const handleUpdateModpack = async () => {
    await startModpackInstall(true);
  };




  return (

    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
      <Toaster />



      {/* Initial Loading Screen */}

      <AnimatePresence>

        {showInitialLoading && (

          <InitialLoadingScreen onComplete={handleInitialLoadingComplete} />

        )}

      </AnimatePresence>



      <LoadingScreen

        open={showLoadingScreen}

        logs={[...serverLogs, ...launchNotes]}

        progress={loadingProgress}

      />

      <VerifyScreen

        open={showVerifyScreen}

        logs={[...serverLogs, ...verifyNotes]}

        progress={verifyProgress}

      />

      <CompileScreen

        open={showCompileScreen}

        logs={[...serverLogs, ...compileNotes]}

        progress={compileProgress}

      />

      <DownloadScreen
        open={showDownloadScreen}
        progress={modpackState?.progress ?? 0}
        downloadedBytes={modpackState?.downloadedBytes ?? 0}
        totalBytes={modpackState?.totalBytes ?? 0}
        speedBps={modpackState?.speedBps ?? 0}
        phase={modpackState?.phase}
        message={modpackState?.message}
      />

      <InstallScreen
        open={showInstallScreen}
        progress={modpackState?.progress ?? 0}
        phase={modpackState?.phase}
        message={modpackState?.message}
        logs={modpackLogs}
      />

      <ConfirmDialog

        open={showResetConfirm}

        onOpenChange={setShowResetConfirm}

        title="Reset Installation"

        description="Are you sure you want to reset your Titanfall 2 installation to its vanilla state? This will remove all mods and settings."

        onConfirm={handleResetInstallation}

      />



      {!showInitialLoading && (

        <>

          {/* Header */}

          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">

            <div className="container mx-auto px-6 py-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-6">

                  <div className="flex items-center gap-3">

                    <motion.div

                      className="relative w-12 h-12 flex items-center justify-center"

                      whileHover={{ scale: 1.05 }}

                      transition={{ type: "spring", stiffness: 400 }}

                    >

                      <img

                        src={logoImage}

                        alt="Project-P1L0T Logo"

                        className="w-full h-full object-contain"

                      />

                      <motion.div

                        className="absolute inset-0 blur-xl bg-primary/30 -z-10"

                        animate={{ opacity: [0.3, 0.6, 0.3] }}

                        transition={{ duration: 2, repeat: Infinity }}

                      />

                    </motion.div>

                    <div>

                      <h1 className="text-2xl tracking-tight text-foreground">PROJECT-P1L0T</h1>

                      <div className="flex items-center gap-2">

                        <motion.div

                          className="w-1.5 h-1.5 rounded-full bg-[#4da8da]"

                          animate={{ opacity: [1, 0.3, 1] }}

                          transition={{ duration: 1.5, repeat: Infinity }}

                        />

                        <p className="text-xs text-muted-foreground">Northstar Mod Launcher</p>

                      </div>

                    </div>

                  </div>



                  {/* View Toggle */}

                  <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-secondary/30">

                    <Button

                      variant={currentView === "launcher" ? "default" : "ghost"}

                      size="sm"

                      onClick={() => setCurrentView("launcher")}

                      className={currentView === "launcher" ? "bg-primary hover:bg-primary/90" : ""}

                    >

                      <Home className="w-4 h-4 mr-2" />

                      Launcher

                    </Button>

                    <Button

                      variant={currentView === "modding" ? "default" : "ghost"}

                      size="sm"

                      onClick={() => setCurrentView("modding")}

                      className={currentView === "modding" ? "bg-primary hover:bg-primary/90" : ""}

                    >

                      <Wrench className="w-4 h-4 mr-2" />

                      Modding

                    </Button>

                  </div>

                </div>



                <div className="flex items-center gap-4">

                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded border border-[#4da8da]/20">

                    <Package className="w-4 h-4 text-[#4da8da]" />

                    <span>{enabledModsCount} / {mods.length} mods active</span>

                  </div>



                  <div className="flex items-center gap-2">

                    <SettingsDialog

                      config={config}

                      modpackStatus={modpackStatus}

                      onDisableAllMods={handleDisableAllMods}

                      onEnableAllMods={handleEnableAllMods}

                      onResetInstallation={() => setShowResetConfirm(true)}

                      onOpenFolder={handleOpenFolder}

                      onChangeConfig={handleUpdateConfig}

                      onImportLocalMod={handleImportMod}

                      onImportModpack={handleImportModpack}

                      onExportProfile={handleExportProfile}

                      onExportModpack={handleExportProfile}

                      onCleanModCache={handleCleanModCache}

                      onCopyLog={handleCopyLog}

                      onCopyTroubleshooting={handleCopyTroubleshooting}

                      onCompatibilityCheck={handleCompatibilityCheck}

                      onDependencyCheck={handleDependencyCheck}

                      onOpenLogFolder={handleOpenLogFolder}

                      onUpdateModpack={handleUpdateModpack}
                      onOpenLaunchParams={() => {

                        setCurrentView("modding");

                        setModdingTab("launch-params");

                      }}

                    />

                    <Button

                      variant="outline"

                      size="icon"

                      onClick={handleCloseApp}

                      className="border-border hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"

                    >

                      <X className="w-5 h-5" />

                    </Button>

                  </div>

                </div>

              </div>

            </div>

          </header>



          {/* Main Content Area */}

          <div className="flex-1 min-h-0 container mx-auto px-6 py-8 overflow-hidden">
            {currentView === "launcher" ? (
              <div className="h-full overflow-hidden">
                <MainLauncher
                  onLaunchGame={handleLaunchGame}
                  enabledModsCount={enabledModsCount}
                  totalModsCount={mods.length}
                  isProcessing={isProcessing}
                />
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <ModdingView
                  mods={mods}
                  onToggleMod={handleToggleMod}
                  onDeleteMod={handleDeleteMod}
                  onVerifyFiles={handleVerifyFiles}
                  onCompileFiles={handleCompileFiles}
                  onImportMod={handleImportMod}
                  isProcessing={isProcessing}
                  enabledModsCount={enabledModsCount}
                  configText={configText}
                  launchParams={launchParams}
                  onSaveConfig={handleSaveConfigText}
                  onUpdateLaunchParams={handleUpdateLaunchParams}
                  activeTab={moddingTab}
                  onTabChange={setModdingTab}
                />
              </div>
            )}
          </div>


          {/* Footer */}

          <footer className="border-t border-border mt-auto">

            <div className="container mx-auto px-6 py-6">

              <div className="flex flex-col gap-4">

                <div className="flex items-center justify-between text-sm text-muted-foreground">

                  <p>Project-P1L0T - Titanfall 2 Mod Manager</p>

                  <p>Ready for deployment - Stand by for Titanfall</p>

                </div>



                <Separator className="bg-border/50" />



                <div className="flex items-center justify-between text-xs">

                  <div className="flex items-center gap-2 text-muted-foreground">

                    <User className="w-3.5 h-3.5 text-[#4da8da]" />

                    <span>Created by <span className="text-foreground font-medium">Beurkson</span> & <span className="text-foreground font-medium">GPT-CODEX</span></span>

                  </div>



                  <a

                    href="mailto:cydonianheavyindustries@gmail.com"

                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"

                  >

                    <Mail className="w-3.5 h-3.5 text-[#4da8da] group-hover:text-primary transition-colors" />

                    <span>cydonianheavyindustries@gmail.com</span>

                  </a>

                </div>

              </div>

            </div>

          </footer>

        </>

      )}

    </div>

  );

}



export default App;


