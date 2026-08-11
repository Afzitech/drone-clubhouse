import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { notifyUsers } from "@/lib/notifications.functions";
import { useServerFn } from "@tanstack/start";

export function EnrollmentForm() {
  const notify = useServerFn(notifyUsers);
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone_number: '', roll_number: '', department: '', past_experience: ''
  });
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const { error } = await supabase.from('club_enrollments').insert([formData]);

    if (!error) {
      try {
        const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
        if (admins && admins.length > 0) {
          await notify({
            data: {
              userIds: admins.map(a => a.user_id),
              type: "new-recruit",
              title: "New Recruit Alert",
              body: "A new applicant has submitted their squadron enrollment form.",
              link: "/admin",
            },
          });
        }
      } catch (err) {
        console.error("notify admins failed", err);
      }
    }

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('success');
      setFormData({ full_name: '', email: '', phone_number: '', roll_number: '', department: '', past_experience: '' });
    }
  };

  if (status === 'success') {
    return (
      <div className="hud-panel corner-brackets max-w-lg mx-auto p-8 text-center space-y-4">
        <h3 className="display-font text-2xl text-primary">TRANSMISSION RECEIVED</h3>
        <p className="mono text-xs text-muted-foreground tracking-widest uppercase">
          Your application has been logged into the terminal. An admin will review your profile shortly.
        </p>
        <button onClick={() => setStatus('idle')} className="mt-4 mono rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20">
          Acknowledge
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="hud-panel corner-brackets max-w-lg mx-auto space-y-5 p-6 w-full">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">/ Squadron Recruitment /</p>
        <h2 className="display-font mt-1 text-xl text-foreground">INITIALIZE ENROLLMENT</h2>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Full Name</span>
          <input type="text" name="full_name" required value={formData.full_name} onChange={handleChange} className="hud-input mt-1 block w-full" placeholder="Enter legal name" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Email Address</span>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="hud-input mt-1 block w-full" placeholder="Transmission contact" />
          </label>
          <label className="block">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Phone Number</span>
            <input type="tel" name="phone_number" required value={formData.phone_number} onChange={handleChange} className="hud-input mt-1 block w-full" placeholder="+91..." />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Roll Number</span>
            <input type="text" name="roll_number" required value={formData.roll_number} onChange={handleChange} className="hud-input mt-1 block w-full" placeholder="e.g. IMU/26/001" />
          </label>
          <label className="block">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Department</span>
            <input type="text" name="department" required value={formData.department} onChange={handleChange} className="hud-input mt-1 block w-full" placeholder="e.g. Marine Engineering" />
          </label>
        </div>

        <label className="block">
          <span className="mono flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Drone & Robotics Experience</span>
            <span className="text-primary/50">[OPTIONAL]</span>
          </span>
          <textarea name="past_experience" value={formData.past_experience} onChange={handleChange} className="hud-input mt-1 block w-full h-20 resize-none" placeholder="Any past builds, flight hours, or coding experience?"></textarea>
        </label>
      </div>

      {status === 'error' && <p className="mono text-[10px] uppercase tracking-widest text-destructive">Error: {errorMessage}</p>}

      <button type="submit" disabled={status === 'submitting'} className="mono w-full mt-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/20 disabled:opacity-40">
        {status === 'submitting' ? 'TRANSMITTING...' : 'SUBMIT APPLICATION'}
      </button>
    </form>
  );
}
