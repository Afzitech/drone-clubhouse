import { useTheme } from @/hooks/use-theme;
import { Capacitor } from @capacitor/core;

export function ThemeToggle({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "icon";
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const handleToggle = () => {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      document.body.classList.add('disable-transitions');
    }
    toggle();
    if (isNative) {
      setTimeout(() => {
        document.body.classList.remove('disable-transitions');
      }, 50);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isDark ? "Switch to daylight cockpit" : "Switch to night HUD"}
        title={isDark ? "Daylight" : "Night HUD"}
        className={spotlight mono flex h-9 w-9 items-center justify-center rounded-md border border-border text-base text-foreground transition hover:text-primary ${className}}
      >
        <span className="transition-transform duration-500" style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}>
          {isDark ? '\u263E' : '\u2600'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle theme"
      className={spotlight relative flex items-center gap-2 rounded-full border border-border bg-surface/60 p-1 pl-2 pr-3 transition ${className}}
    >
      <span
        className="relative flex h-7 w-14 items-center rounded-full bg-background/60 p-1"
      >
        <span
          className="absolute h-5 w-5 rounded-full bg-primary shadow-[0_0_16px_2px_var(--color-glow)] transition-transform duration-500 ease-out"
          style={{ transform: isDark ? "translateX(28px)" : "translateX(0px)" }}
        />
        <span className="mono ml-1 text-[9px] uppercase tracking-widest text-muted-foreground">
          {'\u2600'}
        </span>
        <span className="mono ml-auto mr-1 text-[9px] uppercase tracking-widest text-muted-foreground">
          {'\u263E'}
        </span>
      </span>
      <span className="mono hidden text-[10px] uppercase tracking-widest text-foreground sm:inline">
        {isDark ? "Night HUD" : "Daylight"}
      </span>
    </button>
  );
}