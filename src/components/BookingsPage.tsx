import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Booking = {
  id: string;
  user_id: string;
  kind: "club_room" | "printer_3d";
  purpose: string;
  start_at: string;
  end_at: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  admin_note: string | null;
  created_at: string;
};

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function StatusBadge({ status }: { status: Booking["status"] }) {
  const map: Record<Booking["status"], string> = {
    pending: "border-warning/50 bg-warning/10 text-warning",
    approved: "border-primary/50 bg-primary/10 text-primary",
    rejected: "border-destructive/50 bg-destructive/10 text-destructive",
    cancelled: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`mono rounded border px-2 py-0.5 text-[9px] uppercase tracking-widest ${map[status]}`}
    >
      {status}
    </span>
  );
}

export function BookingsPage({
  kind,
  title,
  tagline,
  description,
}: {
  kind: Booking["kind"];
  title: string;
  tagline: string;
  description: string;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string | null>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [start, setStart] = useState(toLocalInput(new Date(Date.now() + 3600_000)));
  const [end, setEnd] = useState(toLocalInput(new Date(Date.now() + 2 * 3600_000)));
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? null);
    const { data } = await supabase
      .from("resource_bookings")
      .select("id,user_id,kind,purpose,start_at,end_at,status,admin_note,created_at")
      .eq("kind", kind)
      .order("start_at", { ascending: false });
    const list = (data ?? []) as Booking[];
    setBookings(list);
    const ids = Array.from(new Set(list.map((b) => b.user_id)));
    if (ids.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);
      const map: Record<string, string | null> = {};
      (p ?? []).forEach((row) => (map[row.id] = row.display_name));
      setProfiles(map);
    }
  }

  useEffect(() => {
    load();
  }, [kind]);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const startAt = new Date(start);
    const endAt = new Date(end);
    if (endAt <= startAt) return alert("End time must be after start.");
    setBusy(true);
    const { error } = await supabase.from("resource_bookings").insert({
      user_id: userId,
      kind,
      purpose: purpose.trim(),
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "pending",
    });
    setBusy(false);
    if (error) return alert(error.message);
    setPurpose("");
    load();
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    const { error } = await supabase
      .from("resource_bookings")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return alert(error.message);
    load();
  }

  const upcoming = bookings.filter(
    (b) => b.status === "approved" && new Date(b.end_at) > new Date(),
  );
  const mine = userId ? bookings.filter((b) => b.user_id === userId) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          {tagline}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mono mt-1 text-[11px] text-muted-foreground">
          {description}
        </p>
      </div>

      <form
        onSubmit={request}
        className="hud-panel corner-brackets grid gap-3 p-5 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <p className="mono text-[10px] uppercase tracking-widest text-command">
            / Request slot /
          </p>
        </div>
        <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground md:col-span-2">
          Purpose
          <input
            className="hud-input mt-1"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
            maxLength={200}
            placeholder="e.g. Team assembly session"
          />
        </label>
        <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Start
          <input
            className="hud-input mt-1"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </label>
        <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          End
          <input
            className="hud-input mt-1"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </label>
        <div className="md:col-span-2">
          <button
            disabled={busy}
            className="mono rounded border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="mono text-[11px] uppercase tracking-widest text-primary">
          Upcoming approved
        </h2>
        {upcoming.length === 0 ? (
          <p className="mono text-[11px] text-muted-foreground">
            No upcoming approved bookings.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((b) => (
              <li key={b.id} className="hud-panel flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {b.purpose}
                  </p>
                  <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {profiles[b.user_id] ?? "member"} ·{" "}
                    {new Date(b.start_at).toLocaleString()} →{" "}
                    {new Date(b.end_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="mono text-[11px] uppercase tracking-widest text-primary">
          My requests
        </h2>
        {mine.length === 0 ? (
          <p className="mono text-[11px] text-muted-foreground">
            You have not requested this resource yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {mine.map((b) => (
              <li key={b.id} className="hud-panel corner-brackets p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {b.purpose}
                    </p>
                    <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(b.start_at).toLocaleString()} →{" "}
                      {new Date(b.end_at).toLocaleString()}
                    </p>
                    {b.admin_note && (
                      <p className="mono mt-1 text-[10px] text-command">
                        Admin: {b.admin_note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={b.status} />
                    {(b.status === "pending" || b.status === "approved") && (
                      <button
                        onClick={() => cancel(b.id)}
                        className="mono text-[10px] uppercase tracking-widest text-destructive hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
