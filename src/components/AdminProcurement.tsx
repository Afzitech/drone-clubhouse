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
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      const pMap: Record<string, string> = {};
      data.forEach(p => {
        // Fallback chain just in case some pilots haven't filled out their full profile
        pMap[p.id] = p.full_name || p.name || p.username || 'UNKNOWN PILOT';
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
    const formalizedName = prompt("ASSET INJECTION PROTOCOL\n\nEnter the official catalog name for this component to inject it into the Main Inventory Matrix:", req.reason || req.component_name);
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

  const pending = requests.filter(r => r.status === 'Pending');
  const ordered = requests.filter(r => r.status === 'Approved');
  const history = requests.filter(r => r.status === 'Rejected' || r.status === 'Returned' || r.status === 'Received');

  if (loading) return <div className="text-primary animate-pulse tracking-widest font-mono">SYNCING PROCUREMENT MATRIX...</div>;

  return (
    <div className="flex flex-col gap-8 font-mono w-full animate-in fade-in">
      
      {/* PENDING PROCUREMENT */}
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
                    PILOT: <span className="text-foreground font-bold">{profiles[req.user_id] || req.requester_name || "UNKNOWN"}</span> | QTY: {req.quantity}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase mt-2 block border-l-2 border-primary/50 pl-2">
                    {req.reason || req.component_name || 'NO DESCRIPTION PROVIDED'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded text-xs hover:bg-green-500/20 flex items-center gap-1 uppercase tracking-widest"><ShoppingCart className="w-3 h-3"/> Order Item</button>
                  <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded text-xs hover:bg-destructive/20 flex items-center gap-1 uppercase tracking-widest"><X className="w-3 h-3"/> Deny</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVE ORDERS */}
      <div className="bg-card border border-primary/20 rounded-lg p-6 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-primary tracking-widest uppercase flex items-center gap-2 border-b border-border pb-2">
           <ShoppingCart className="w-4 h-4"/> Active Orders ({ordered.length})
        </h3>
        {ordered.length === 0 ? (
          <div className="text-muted-foreground text-xs p-4 text-center tracking-widest border border-dashed border-border rounded">NO ACTIVE ORDERS.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {ordered.map(req => (
              <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-background border border-border p-4 rounded border-l-2 border-l-primary shadow-[0_0_15px_rgba(0,255,255,0.05)]">
                <div>
                  <span className="font-bold text-foreground block mb-1">CUSTOM ASSET REQUEST</span>
                  <span className="text-xs text-muted-foreground block">
                    PILOT: {profiles[req.user_id] || req.requester_name || "UNKNOWN"} | QTY: {req.quantity}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase mt-2 block border-l-2 border-primary/50 pl-2">
                    {req.reason || req.component_name || 'NO DESCRIPTION PROVIDED'}
                  </span>
                </div>
                <div className="mt-4 md:mt-0">
                  <button onClick={() => handleMarkReceived(req)} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded text-xs hover:bg-primary/20 flex items-center gap-1 uppercase tracking-widest transition-all"><CheckCircle2 className="w-3 h-3"/> Mark Received</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PROCUREMENT HISTORY */}
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-muted-foreground tracking-widest uppercase flex items-center gap-2 border-b border-border pb-2">
           <Archive className="w-4 h-4"/> Procurement History ({history.length})
        </h3>
        {history.length === 0 ? (
          <div className="text-muted-foreground text-xs p-4 text-center tracking-widest border border-dashed border-border rounded">NO HISTORY FOUND.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map(req => (
              <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-background border border-border p-3 rounded opacity-70 group hover:opacity-100 transition-all">
                <div>
                  <span className="font-bold text-muted-foreground group-hover:text-foreground transition-colors block mb-1">CUSTOM ASSET REQUEST</span>
                  <span className="text-xs text-muted-foreground block">
                    PILOT: {profiles[req.user_id] || req.requester_name || "UNKNOWN"} | QTY: {req.quantity} | STATUS: <span className={req.status === 'Received' || req.status === 'Returned' ? 'text-primary' : 'text-destructive'}>{req.status === 'Returned' ? 'RECEIVED' : req.status.toUpperCase()}</span>
                  </span>
                </div>
                <div className="mt-3 md:mt-0">
                  <button onClick={() => handleDelete(req.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Purge Record">
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}