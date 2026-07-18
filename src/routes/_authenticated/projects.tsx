import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/projects")({
  component: () => (
    <div className="hud-panel corner-brackets p-8 text-center">
      <p className="mono text-[10px] uppercase tracking-widest text-primary">Module</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground">Projects</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Status board coming online in the next build phase.
      </p>
    </div>
  ),
});
