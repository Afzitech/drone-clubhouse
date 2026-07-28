import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, AlertCircle, ShoppingCart, Archive, Trash2, CheckCircle2 } from 'lucide-react';

export default function AdminProcurement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchProcurements(); 
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error("PROFILES DB ERROR:", error);
    if (data) {
      const pMap: Record<string, string> = {};
      data.forEach(p => {
        pMap[p.id] = p.display_name || p.full_name || p.name || p.username || 'NO-NAME-SET';
      });
      setProfiles(pMap);
    }
  };

  const fetchProcurements = async () => {
    const { data, error } = await supabase
      .from('procurement_requests')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) alert("PROCUREMENT DB ERROR: " + error.message);
    else if (data) setRequests(data);
    setLoading(false);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('procurement_requests').update({ status: newStatus }).eq('id', id);
    if (error) alert("UPDATE ERROR: " + error.message);
    else fetchProcurements();
  };

  const handleMarkReceived = async (req: any) => {
    const formalizedName = prompt("ASSET INJECTION PROTOCOL\n\nEnter the official catalog name for this component:", req.reason || req.component_name);
    if (!formalizedName) return;

    const { error: insertError } = await supabase.from('inventory_items').insert([{
        name: formalizedName,
        category: 'Custom Request', 
        total_quantity: req.quantity,
        available_quantity: req.quantity,
        minimum_stock: 1,
        status: 'Active'
    }]);
    
    if (insertError) {
        alert("INVENTORY INJECTION FAILED: " + insertError.message);
        return;
    }

    const { error: updateError } = await supabase.from('procurement_requests').update({ status: 'Received' }).eq('id', req.id);
    if (updateError) alert("STATUS UPDATE ERROR: " + updateError.message);
    else fetchProcurements();
  };

  const handleDelete = async (id: string) => {
    if(confirm('Permanently purge this custom procurement record?')) {
      const { error } = await supabase.from('procurement_requests').delete().eq('id', id);
      if (error) alert("DELETE ERROR: " + error.message);
      else fetchProcurements();
    }
  };

  const getPilotName = (req: any) => {
    if (!req.member_id) return "DEBUG: NULL ID IN DB";
    if (profiles[req.member_id]) return profiles[req.member_id];
    return `DEBUG: PROFILE MISSING FOR [${req.member_id.substring(0,8)}...]`;
  };

  const pending = requests.filter(r => r.status === 'Pending' || !r.status);
  const ordered = requests.filter(r => r.status === 'Approved');
  const history = requests.filter(r => r.status === 'Rejected' || r.status === 'Returned' || r.status === 'Received');

  if (loading) return <div className="text-primary animate-pulse tracking-widest font-mono">SYNCING PROCUREMENT MATRIX...</div>;

  return (
    <div className="flex flex-col gap-8 font-mono w-full animate-in fade-in">
      <div className="bg-card border border-destructive/20 rounded-lg p-6 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-destructive tracking-widest uppercase flex items-center gap-2 border-b border-border pb-2">
           <AlertCircle className="w-4 h-4"/> Pending Procurement ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="text-muted-foreground text-xs p-4 text-center tracking-widest border border-dashed border-border rounded">NO PENDING REQUESTS.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map(req => (
              <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-background border border-border p-4 rounded">
                <div>
                  <span className="font-bold text-foreground block mb-1">CUSTOM ASSET REQUEST</span>
                  <span className="text-xs text-muted-foreground block">
                    PILOT: <span className="text-primary font-bold">{getPilotName(req)}</span> | QTY: {req.quantity}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase mt-2 block border-l-2 border-primary/50 pl-2">
                    {req.reason || req.component_name || 'NO DESCRIPTION PROVIDED'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded text-xs hover:bg-green-500/20 uppercase tracking-widest"><ShoppingCart className="w-3 h-3 inline mr-1"/> Order</button>
                  <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded text-xs hover:bg-destructive/20 uppercase tracking-widest"><X className="w-3 h-3 inline mr-1"/> Deny</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// Forced Deploy Trigger: 1785225950909