import React from "react";

export default function AdminProcurement() {
  return (
    <div className="space-y-6">
      <div className="hud-panel corner-brackets p-6">
        <p className="mono text-[10px] uppercase tracking-widest text-command">
          Procurement Command
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Procurement Requests
        </h2>

        <p className="mt-2 text-muted-foreground">
          No procurement requests yet.
        </p>
      </div>
    </div>
  );
}
