"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const registerServiceWorker = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          console.log("✓ Service Worker registered:", reg);
        }
      } catch (err) {
        console.error("✗ Service Worker registration failed:", err);
      }
    };

    registerServiceWorker();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("✓ beforeinstallprompt event fired");
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setInstallPrompt(event);
      setShowButton(true);
      setError(null);
    };

    // Check if already installed
    const checkIfInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        console.log("✓ App is running as PWA");
        setShowButton(false);
      } else if (navigator.standalone === true) {
        console.log("✓ App is running as PWA (iOS)");
        setShowButton(false);
      }
    };

    checkIfInstalled();

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      console.log("✓ App installed successfully");
      setShowButton(false);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setError("Install prompt not available. Try again.");
      return;
    }

    setIsInstalling(true);
    setError(null);

    try {
      console.log("📱 Prompting installation...");
      await installPrompt.prompt();

      const { outcome } = await installPrompt.userChoice;
      console.log(`User response: ${outcome}`);

      if (outcome === "accepted") {
        console.log("✓ Installation accepted");
        setShowButton(false);
        setInstallPrompt(null);
      } else {
        console.log("✗ Installation dismissed");
        setError("Installation cancelled. Try again later.");
      }
    } catch (err) {
      console.error("✗ Installation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Installation failed. Please try again.",
      );
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowButton(false);
    setError(null);
  };

  // Only show on Android or mobile
  const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);

  if (!showButton || !installPrompt || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-32">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-3 sm:p-4 max-w-xs">
        {/* Error message */}
        {error && (
          <div className="mb-3 p-2 bg-red-500/20 rounded text-xs text-red-100 border border-red-300/30">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 sm:gap-3">
            <Download className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm">Install App</p>
              <p className="text-xs text-blue-100">
                Quick access on home screen
              </p>
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
          className="mt-2 sm:mt-3 w-full bg-white text-blue-600 font-semibold py-2 sm:py-2.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
        >
          {isInstalling ? "Installing..." : "Install Now"}
        </button>
      </div>
    </div>
  );
}
