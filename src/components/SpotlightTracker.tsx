import { useEffect } from "react";

/**
 * Global pointer tracker: any element with the `spotlight` utility receives
 * --mx / --my (px within the element) and --active (0/1) so the CSS glow follows
 * the pointer. Also handles touch for mobile taps.
 */
export function SpotlightTracker() {
  useEffect(() => {
    let currentTargets = new Set<HTMLElement>();

    function findSpotlight(el: EventTarget | null): HTMLElement | null {
      let node = el as HTMLElement | null;
      while (node && node !== document.body) {
        if (node.classList && node.classList.contains("spotlight")) return node;
        node = node.parentElement;
      }
      return null;
    }

    function setActive(el: HTMLElement, on: boolean) {
      el.style.setProperty("--active", on ? "1" : "0");
      if (on) currentTargets.add(el);
      else currentTargets.delete(el);
    }

    function onMove(e: PointerEvent) {
      const target = findSpotlight(e.target);
      // deactivate others
      for (const el of Array.from(currentTargets)) {
        if (el !== target) setActive(el, false);
      }
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      target.style.setProperty("--my", `${e.clientY - rect.top}px`);
      setActive(target, true);
    }

    function onLeave() {
      for (const el of Array.from(currentTargets)) setActive(el, false);
      currentTargets = new Set();
    }

    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const target = findSpotlight(document.elementFromPoint(t.clientX, t.clientY));
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${t.clientX - rect.left}px`);
      target.style.setProperty("--my", `${t.clientY - rect.top}px`);
      setActive(target, true);
      setTimeout(() => setActive(target, false), 700);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);

  return null;
}
