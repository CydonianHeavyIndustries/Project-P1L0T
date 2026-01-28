import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Play, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "./ui/progress";
import cinematic01 from "../../assets/cinematic/cinematic-01.png";
import cinematic02 from "../../assets/cinematic/cinematic-02.png";
import cinematic03 from "../../assets/cinematic/cinematic-03.png";
import cinematic04 from "../../assets/cinematic/cinematic-04.png";

interface Slide {
  id: number;
  image: string;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
}

interface MainLauncherProps {
  onLaunchGame: () => void;
  enabledModsCount: number;
  totalModsCount: number;
  isProcessing?: boolean;
}

const slides: Slide[] = [
  {
    id: 1,
    image: cinematic01,
    title: "PROJECT-P1L0T v2.0.0",
    description: "Roadmap v15 applied. Launcher now treats GitHub main as source of truth and self-syncs on boot.",
  },
  {
    id: 2,
    image: cinematic02,
    title: "REPO-BASED MODPACK",
    description: "Modpack lives in repo and updates alongside the launcher for every boot.",
  },
  {
    id: 3,
    image: cinematic03,
    title: "STABILITY & VERIFY",
    description: "Default profile path locked to modpack; verify/compile flow tightened for 58/58 mods active.",
  },
  {
    id: 4,
    image: cinematic04,
    title: "COMMUNITY HUB",
    description:
      "Join the Project-P1L0T Discord for progress updates, test sessions, and dropzone feedback.",
    link: "https://discord.gg/SJGXsUXWGS",
    linkText: "Join Us",
  },
];

const patchNotes = [
  "Launcher now hard-syncs with GitHub main on boot (fetch + hard reset).",
  "Repo-based modpack: assets and 58/58 mods bundled in-profile; verification fixes applied.",
  "Stability: Fort War scripts restored; WeaponLaser vscripts stub; EntityStatus settings temporarily stubbed.",
  "Version bump to v2.0.0 aligned with roadmap v15 (ship rules + phases).",
  "UI assets (logo/icon) now sourced from repo so all agents stay in sync.",
  "Launch parameters remain at -novid -high -fullscreen +fps_max 144; profile path locked to modpack.",
];

export function MainLauncher({
  onLaunchGame,
  enabledModsCount,
  totalModsCount,
  isProcessing = false,
}: MainLauncherProps) {
  const [activeTab, setActiveTab] = useState("news");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showJoinUs, setShowJoinUs] = useState(false);
  const [progress] = useState(100);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const openJoinUs = () => {
    setShowJoinUs(true);
  };

  const closeJoinUs = () => {
    setShowJoinUs(false);
  };

  // Auto-advance slides every 8 seconds
  useEffect(() => {
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, []);

  const currentSlideData = slides[currentSlide];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-8 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab("news")}
                className={`text-sm font-medium pb-1 transition-all ${
                  activeTab === "news"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NEWS
              </button>
              <button
                onClick={() => setActiveTab("patch")}
                className={`text-sm font-medium pb-1 transition-all ${
                  activeTab === "patch"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                PATCH NOTES
              </button>
              <button
                onClick={() => setActiveTab("northstar")}
                className={`text-sm font-medium pb-1 transition-all ${
                  activeTab === "northstar"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NORTHSTAR
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={openJoinUs}
              className="border-[#5865F2] text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-2" />
              Join Us
            </Button>
            <span className="text-xs text-muted-foreground">v2.0.0</span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="relative flex-1 overflow-hidden">
        {activeTab === "news" && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img
                    src={currentSlideData.image}
                    alt={currentSlideData.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
                </div>

                {/* Content Overlay */}
                <div className="relative h-full flex flex-col justify-end pb-32">
                  <div className="px-12 max-w-2xl">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-5xl font-bold text-foreground mb-6 tracking-tight"
                    >
                      {currentSlideData.title}
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-muted-foreground leading-relaxed mb-8 text-lg"
                    >
                      {currentSlideData.description}
                    </motion.p>

                    {currentSlideData.link && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Button
                          variant="outline"
                          onClick={openJoinUs}
                          className="border-primary/50 hover:bg-primary/10 hover:border-primary"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {currentSlideData.linkText || "Learn More"}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background hover:border-primary/50 transition-all flex items-center justify-center group"
            >
              <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background hover:border-primary/50 transition-all flex items-center justify-center group"
            >
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1 rounded-full transition-all ${
                    index === currentSlide
                      ? "w-8 bg-primary"
                      : "w-4 bg-muted-foreground/50 hover:bg-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === "patch" && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/60" />
            <div className="relative h-full flex flex-col justify-center px-12 pb-32">
              <div className="max-w-3xl">
                <h2 className="text-4xl font-bold text-foreground mb-6">Patch Notes v1.0.0</h2>
                <ul className="space-y-3 text-muted-foreground text-lg leading-relaxed">
                  {patchNotes.map((note) => (
                    <li key={note} className="flex gap-3">
                      <span className="text-primary">-</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "northstar" && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/60" />
            <div className="relative h-full flex flex-col justify-center px-12 pb-32">
              <div className="max-w-3xl space-y-4 text-muted-foreground text-lg leading-relaxed">
                <h2 className="text-4xl font-bold text-foreground">Northstar Status</h2>
                <p>
                  Northstar provides the core modding runtime. Use Verify Files to confirm scripts
                  and mod manifests before launching.
                </p>
                <p>
                  If a mod reports missing scripts or undefined variables, keep it enabled and
                  log the error so we can patch it in Project-P1L0T.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="px-12 py-6">
            <div className="flex items-center gap-6">
              {/* Download Progress Section */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    DOWNLOAD FOR YOUR PLATFORM
                  </span>
                  <span className="text-foreground font-mono">
                    {enabledModsCount} / {totalModsCount} mods active
                  </span>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-2 bg-secondary" />
                  <div
                    className="absolute top-0 left-0 h-full bg-primary/20 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>DOWNLOAD PROGRESS</span>
                  <span>{progress}%</span>
                </div>
              </div>

              {/* Play Button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-lg" />
                <Button
                  onClick={onLaunchGame}
                  disabled={isProcessing}
                  size="lg"
                  className="relative bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 px-16 h-16 text-2xl font-bold tracking-wide group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <Play className="w-6 h-6 mr-3 fill-current" />
                  PLAY
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showJoinUs && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-[90vw] max-w-4xl h-[80vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80">
                <div>
                  <h3 className="text-lg text-foreground">Join Project-P1L0T</h3>
                  <p className="text-sm text-muted-foreground">Live community, updates, and test runs.</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeJoinUs}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex flex-col h-[calc(80vh-64px)]">
                <div className="flex-1 p-4">
                  <iframe
                    title="Project-P1L0T Discord"
                    src="https://discord.com/widget?id=1432391621839687830&theme=dark"
                    className="w-full h-full rounded-xl border border-border"
                    allowTransparency={true}
                    frameBorder={0}
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  />
                </div>
                <div className="px-6 pb-4 text-xs text-muted-foreground">
                  Discord widget requires widgets to be enabled in server settings.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
