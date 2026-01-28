import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Progress } from "./ui/progress";
import logoImage from "../../assets/project-p1lot-logo.png";

interface InitialLoadingScreenProps {
  onComplete: () => void;
}

const loadingMessages = [
  "Initializing Titan OS...",
  "Loading core systems...",
  "Connecting to IMC mainframe...",
  "Establishing neural link...",
  "Synchronizing pilot data...",
  "Calibrating weapons systems...",
  "Loading Northstar protocols...",
  "Systems online...",
];

export function InitialLoadingScreen({ onComplete }: InitialLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [glitchEffect, setGlitchEffect] = useState(false);

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => onComplete(), 500);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    // Message rotation
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev >= loadingMessages.length - 1) {
          clearInterval(messageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      setGlitchEffect(true);
      setTimeout(() => setGlitchEffect(false), 100);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      clearInterval(glitchInterval);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 flex items-center justify-center"
    >
      {/* Animated Background Grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255, 107, 53, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 107, 53, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }} />
        </div>

        {/* Scanning Lines */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent h-32"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {/* Corner Brackets */}
        <div className="absolute top-8 left-8 w-24 h-24 border-l-2 border-t-2 border-primary/50" />
        <div className="absolute top-8 right-8 w-24 h-24 border-r-2 border-t-2 border-primary/50" />
        <div className="absolute bottom-8 left-8 w-24 h-24 border-l-2 border-b-2 border-primary/50" />
        <div className="absolute bottom-8 right-8 w-24 h-24 border-r-2 border-b-2 border-primary/50" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-12">
        {/* Logo with Glow */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 0, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative"
        >
          <div className="absolute inset-0 blur-3xl bg-primary/30 scale-150" />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 blur-2xl bg-[#4da8da]/20 scale-150"
          />
          <img 
            src={logoImage} 
            alt="Project-P1L0T" 
            className="w-32 h-32 object-contain relative z-10"
          />
        </motion.div>

        {/* Title */}
        <div className="text-center space-y-2">
          <motion.h1 
            className={`text-5xl font-bold tracking-wider transition-all duration-100 ${
              glitchEffect ? 'text-destructive' : 'text-foreground'
            }`}
            style={{
              textShadow: glitchEffect 
                ? '2px 2px #ff6b35, -2px -2px #4da8da' 
                : '0 0 20px rgba(255, 107, 53, 0.5)'
            }}
          >
            PROJECT-P1L0T
          </motion.h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary" />
            <p className="text-sm text-muted-foreground tracking-widest">Version 2.0.1</p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary" />
          </div>
        </div>

        {/* Loading Progress */}
        <div className="w-[500px] space-y-4">
          {/* Progress Bar */}
          <div className="relative">
            <Progress value={progress} className="h-2 bg-secondary" />
            
            {/* Animated Scanner */}
            {progress < 100 && (
              <motion.div
                className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-transparent via-primary/60 to-transparent pointer-events-none"
                animate={{ x: ["-100%", "600%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>

          {/* Status Text */}
          <div className="flex items-center justify-between text-sm">
            <motion.span
              key={messageIndex}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-muted-foreground font-mono"
            >
              {loadingMessages[messageIndex]}
            </motion.span>
            <span className="text-primary font-mono font-bold">{progress}%</span>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-muted-foreground font-mono">CORE</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                className="w-2 h-2 rounded-full bg-[#4da8da]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              />
              <span className="text-muted-foreground font-mono">NEURAL</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
              />
              <span className="text-muted-foreground font-mono">NETWORK</span>
            </div>
          </div>
        </div>

        {/* Binary Rain Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-primary font-mono text-xs"
              style={{ left: `${i * 5}%` }}
              animate={{ y: [-20, window.innerHeight + 20] }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            >
              {Math.random() > 0.5 ? '1' : '0'}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Text */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground font-mono tracking-wider">
          STAND BY FOR TITANFALL
        </p>
      </div>
    </motion.div>
  );
}
