import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/enrollments")({
  component: EnrollmentsAdmin,
});

function EnrollmentsAdmin() {
  const [recruits, setRecruits] = useState<any[]>([]);

  const fetchRecruits = async () => {
    const { data } = await supabase.from("club_enrollments").select("*").order("created_at", { ascending: false });
    if (data) setRecruits(data);
  };

  useEffect(() => {
    fetchRecruits();

    // Listen to real-time database changes
    const channel = supabase
      .channel("realtime-recruits")
      .on("postgres_changes", { event: "*", schema: "public", table: "club_enrollments" }, () => {
        fetchRecruits();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6 mb-6">
        <h1 className="text-3xl font-bold tracking-widest text-primary uppercase mono">/ SQUADRON RECRUITS</h1>
        <p className="text-muted-foreground mt-2 text-xs tracking-widest uppercase mono">
          Review and manage incoming terminal applications (LIVE)
        </p>
      </div>
      
      <div className="hud-panel corner-brackets p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left mono text-xs">
            <thead className="text-primary border-b border-border/50">
              <tr>
                <th className="pb-3 px-4 uppercase tracking-widest">Recruit Identity</th>
                <th className="pb-3 px-4 uppercase tracking-widest">Academic Details</th>
                <th className="pb-3 px-4 uppercase tracking-widest">Comms (Email / Phone)</th>
                <th className="pb-3 px-4 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {recruits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground uppercase tracking-widest">No pending applications found in the databanks.</td>
                </tr>
              ) : (
                recruits.map((r) => (
                  <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                    <td className="py-4 px-4">
                      <span className="font-bold text-foreground block">{r.full_name}</span>
                      <span className="text-[10px] text-muted-foreground mt-1 block max-w-xs truncate" title={r.past_experience}>Exp: {r.past_experience || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <span className="block text-foreground">{r.roll_number}</span>
                      <span className="text-[10px]">{r.department}</span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <span className="block">{r.email}</span>
                      <span className="text-primary/70">{r.phone_number || 'No COMMS'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded uppercase text-[10px] tracking-widest">
                        {r.status}
                      </span>
                      <div className="mt-2 flex gap-2">
                        <button onClick={async () => { await supabase.from('club_enrollments').update({status: 'approved'}).eq('id', r.id); window.location.reload(); }} className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded uppercase text-[9px] tracking-widest hover:bg-green-500/20 transition-colors cursor-pointer">Approve</button>
                        <button onClick={async () => { await supabase.from('club_enrollments').update({status: 'rejected'}).eq('id', r.id); window.location.reload(); }} className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded uppercase text-[9px] tracking-widest hover:bg-red-500/20 transition-colors cursor-pointer">Dismiss</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
