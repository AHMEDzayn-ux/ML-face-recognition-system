"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.log("Service Worker registration failed:", err);
      });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setInstallPrompt(event);
      setShowButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Hide button if app is already installed
    window.addEventListener("appinstalled", () => {
      setShowButton(false);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);

      if (outcome === "accepted") {
        setShowButton(false);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error("Install prompt failed:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowButton(false);
  };

  // Only show on Android or mobile
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);

  if (!showButton || !installPrompt || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-3 max-w-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Install App</p>
              <p className="text-xs text-blue-100">Quick access on home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 hover:bg-blue-500 rounded p-1 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className="mt-3 w-full bg-white text-blue-600 font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm"
        >
          {isInstalling ? "Installing..." : "Install Now"}
        </button>
      </div>
    </div>
  );
}
