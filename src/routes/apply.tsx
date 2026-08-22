import { createFileRoute } from "@tanstack/react-router";
import { EnrollmentForm } from "@/components/EnrollmentForm";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/apply")({
  component: ApplyPage,
});

function ApplyPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial state
    supabase.from('site_settings').select('enrollments_open').eq('id', 1).single().then(({data}) => {
      if (data) setIsOpen(data.enrollments_open);
      setLoading(false);
    });

    // Listen for real-time lockdown commands
    const channel = supabase.channel('settings-listener')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, (payload) => {
         setIsOpen(payload.new.enrollments_open);
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary mono uppercase tracking-widest bg-background">Establishing Uplink...</div>;

  return (
    <div className="min-h-screen bg-background pt-32 px-4 flex flex-col items-center">
      {!isOpen ? (
        <div className="text-center p-12 border border-destructive/30 bg-destructive/5 rounded-lg max-w-2xl mx-auto w-full hud-panel corner-brackets mt-12">
          <h3 className="mono text-destructive uppercase tracking-widest text-lg font-bold">/ DATABANKS LOCKED /</h3>
          <p className="text-muted-foreground mono mt-4 text-xs tracking-widest uppercase">Squadron enrollments are currently frozen.</p>
          <p className="text-muted-foreground mono mt-1 text-[10px] tracking-widest uppercase">Awaiting Command override for next recruitment cycle.</p>
        </div>
      ) : (
         <div className="w-full max-w-2xl">
           <h2 className="text-2xl font-bold mono uppercase tracking-widest text-primary mb-6 text-center">/ INITIALIZE ENROLLMENT</h2>
           <EnrollmentForm />
         </div>
      )}
    </div>
  );
}
