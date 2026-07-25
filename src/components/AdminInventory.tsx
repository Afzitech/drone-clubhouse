import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, AlertCircle } from 'lucide-react';

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch Items to calculate stats
    const { data: itemsData } = await supabase.from('inventory_items').select('*').order('name');
    if (itemsData) setItems(itemsData);

    // Fetch Pending Requests
    const { data: reqData } = await supabase.from('inventory_requests')
      .select('*, inventory_items(name)')
      .eq('status', 'Pending');
    if (reqData) setRequests(reqData);
    
    setLoading(false);
  };

  const handleRequest = async (id: string, newStatus: string) => {
    await supabase.from('inventory_requests').update({ status: newStatus }).eq('id', id);
    fetchData(); // Refresh the HUD automatically
  };

  if (loading) return <div className="text-cyan-500 animate-pulse font-mono tracking-widest p-6">LINKING TO LOGISTICS MAINFRAME...</div>;

  return (
    <div className="flex flex-col gap-8 font-mono text-cyan-50 w-full">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-4 flex flex-col items-center shadow-[0_0_15px_rgba(34,211,238,0.05)]">
          <span className="text-[10px] text-slate-500 tracking-widest mb-1">TOTAL ASSETS</span>
          <span className="text-3xl font-bold text-cyan-400">{items.length}</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-4 flex flex-col items-center">
          <span className="text-[10px] text-slate-500 tracking-widest mb-1">PENDING QUEUE</span>
          <span className="text-3xl font-bold text-yellow-400">{requests.length}</span>
        </div>
        <div className="bg-slate-900/50 border border-red-900/30 p-4 flex flex-col items-center shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <span className="text-[10px] text-red-500 tracking-widest mb-1">CRITICAL STOCK</span>
          <span className="text-3xl font-bold text-red-500">
            {items.filter(i => i.available_quantity <= i.minimum_stock).length}
          </span>
        </div>
      </div>

      {/* Pending Requests Queue */}
      <div className="border border-slate-800 bg-slate-900/30 p-6 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> REQUISITION QUEUE
        </h2>
        
        {requests.length === 0 ? (
          <div className="text-slate-500 text-xs tracking-widest p-4 border border-dashed border-slate-800 text-center">
            NO PENDING REQUESTS. STANDBY.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map(req => (
              <div key={req.id} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-950 p-4 border border-slate-800 transition-all hover:border-cyan-900">
                <div className="mb-4 md:mb-0">
                  <span className="text-cyan-300 font-bold block tracking-wide">{req.inventory_items?.name || 'UNKNOWN COMPONENT'}</span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    QTY: <span className="text-cyan-100">{req.quantity}</span> | REASON: <span className="text-cyan-100">{req.reason || 'N/A'}</span>
                  </span>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => handleRequest(req.id, 'Approved')} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-950/20 text-green-400 border border-green-900/50 hover:bg-green-900 hover:text-green-100 transition-all text-xs tracking-widest"
                  >
                    <Check className="w-4 h-4" /> APPROVE
                  </button>
                  <button 
                    onClick={() => handleRequest(req.id, 'Rejected')} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-950/20 text-red-400 border border-red-900/50 hover:bg-red-900 hover:text-red-100 transition-all text-xs tracking-widest"
                  >
                    <X className="w-4 h-4" /> DENY
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
