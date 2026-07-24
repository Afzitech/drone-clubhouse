import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "aeroforge-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = theme;
}

function playChime(next: Theme) {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const duration = 1.5;

    // --- 3D STEREO PANNING (Full Flyby) ---
    const panner = ctx.createStereoPanner();
    if (next === "light") {
      // Spool up: Full flyby Left (-1) to Right (1)
      panner.pan.setValueAtTime(-1, now);
      panner.pan.linearRampToValueAtTime(1, now + duration);
    } else {
      // Spool down: Full flyby Right (1) to Left (-1)
      panner.pan.setValueAtTime(1, now);
      panner.pan.linearRampToValueAtTime(-1, now + duration);
    }
    panner.connect(ctx.destination);

    // --- 1. DUAL-ROTOR CORE (Detuning Effect) ---
    const rumble1 = ctx.createOscillator();
    const rumble2 = ctx.createOscillator();
    const rumbleFilter = ctx.createBiquadFilter();
    const rumbleGain = ctx.createGain();

    rumble1.type = "sawtooth";
    rumble2.type = "sawtooth";
    rumbleFilter.type = "lowpass";

    if (next === "light") {
      rumble1.frequency.setValueAtTime(60, now);
      rumble1.frequency.linearRampToValueAtTime(180, now + duration);
      
      rumble2.frequency.setValueAtTime(62, now);
      rumble2.frequency.linearRampToValueAtTime(185, now + duration);
      
      rumbleFilter.frequency.setValueAtTime(200, now);
      rumbleFilter.frequency.linearRampToValueAtTime(800, now + duration);
    } else {
      rumble1.frequency.setValueAtTime(180, now);
      rumble1.frequency.linearRampToValueAtTime(60, now + duration);
      
      rumble2.frequency.setValueAtTime(185, now);
      rumble2.frequency.linearRampToValueAtTime(62, now + duration);
      
      rumbleFilter.frequency.setValueAtTime(800, now);
      rumbleFilter.frequency.linearRampToValueAtTime(200, now + duration);
    }

    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    rumble1.connect(rumbleFilter);
    rumble2.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain).connect(panner);
    
    rumble1.start(now);
    rumble2.start(now);
    rumble1.stop(now + duration + 0.2); 
    rumble2.stop(now + duration + 0.2); 

    // --- 2. THE AIR THRUST (Sweeping wind) ---
    const bufferSize = ctx.sampleRate * (duration + 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";

    if (next === "light") {
      noiseFilter.frequency.setValueAtTime(150, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(1500, now + duration);
    } else {
      noiseFilter.frequency.setValueAtTime(1500, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(150, now + duration);
    }

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.4); 
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(noiseFilter).connect(noiseGain).connect(panner);
    noise.start(now);
    noise.stop(now + duration + 0.2);

    setTimeout(() => ctx.close().catch(() => {}), 2000);
  } catch {
    /* ignore */
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" &&
      (localStorage.getItem(KEY) as Theme | null)) as Theme | null;
    const initial: Theme =
      stored ??
      (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setThemeState(initial);
    apply(initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    const root = document.documentElement;
    root.classList.remove("theme-flash");
    void root.offsetWidth;
    root.classList.add("theme-flash");
    setTimeout(() => root.classList.remove("theme-flash"), 700);
    playChime(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}