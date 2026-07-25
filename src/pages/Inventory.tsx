import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, AlertCircle, Send, Clock, RotateCcw, Check } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [reqQty, setReqQty] = useState(1);
  const [reqReason, setReqReason] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchInventoryAndAuth();
  }, []);

  const fetchInventoryAndAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: iData } = await supabase.from('inventory_items').select('*').order('name');
    if (iData) setItems(iData);

    if (user) {
      const { data: rData } = await supabase.from('inventory_requests').select('*, inventory_items(name)').eq('user_id', user.id).order('created_at', { ascending: false });
      if (rData) setMyRequests(rData);
    }
    setLoading(false);
  };

  const handleSubmitRequest = async (item: any) => {
    if (!userId) return alert("UNAUTHORIZED: Sign in to request assets.");
    if (reqQty > item.available_quantity) return alert("INSUFFICIENT STOCK");

    await supabase.from('inventory_requests').insert([{ item_id: item.id, user_id: userId, quantity: reqQty, reason: reqReason }]);
    setRequestingId(null); setReqQty(1); setReqReason('');
    fetchInventoryAndAuth(); // Refresh grids instantly
  };

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Approved': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Rejected': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'Returned': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="p-8 font-mono animate-in fade-in duration-500 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-primary uppercase">/ Logistics Center</h1>
          <p className="text-muted-foreground mt-2 text-sm tracking-widest">AEROFORGE ASSET REQUISITION</p>
        </div>
        <div className="relative group w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input type="text" placeholder="SEARCH HARDWARE..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-background border border-border focus:border-primary rounded py-2 pl-10 pr-4 text-sm outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="text-primary animate-pulse tracking-widest">SYNCING MAINFRAME...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Inventory Grid (3 Columns) */}
          <div className="lg:col-span-3">
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">{item.category}</span>
                    {item.available_quantity < item.minimum_stock && <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 uppercase">LOC: {item.storage_location || 'UNASSIGNED'}</p>
                  </div>
                  <div className="flex flex-col pt-2 border-t border-border mt-auto">
                     <span className="text-[10px] text-muted-foreground tracking-widest mb-1">AVAILABLE STOCK</span>
                     <span className={`text-2xl font-bold ${item.available_quantity > 0 ? 'text-primary' : 'text-destructive'}`}>{item.available_quantity}</span>
                  </div>
                  {requestingId === item.id ? (
                    <div className="flex flex-col gap-2 bg-muted/50 p-2 rounded border border-primary/20 mt-2">
                      <input type="number" min="1" max={item.available_quantity} value={reqQty} onChange={e => setReqQty(parseInt(e.target.value) || 1)} className="bg-background border border-border focus:border-primary p-1.5 text-xs rounded outline-none" placeholder="QTY" />
                      <input type="text" value={reqReason} onChange={e => setReqReason(e.target.value)} className="bg-background border border-border focus:border-primary p-1.5 text-xs rounded outline-none" placeholder="REASON / PROJECT" />
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => setRequestingId(null)} className="flex-1 py-1 border border-border text-muted-foreground hover:bg-muted rounded text-[10px] uppercase">Cancel</button>
                        <button onClick={() => handleSubmitRequest(item)} className="flex-1 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center justify-center gap-1 text-[10px] uppercase"><Send className="w-3 h-3"/> Send</button>
                      </div>
                    </div>
                  ) : (
                    <button disabled={item.available_quantity === 0} onClick={() => { setRequestingId(item.id); setReqQty(1); setReqReason(''); }} className="w-full bg-background border border-border py-2 rounded text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-all disabled:opacity-50 mt-2">
                      {item.available_quantity > 0 ? 'Submit Requisition' : 'Depleted'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User Requisition History Sidebar (1 Column) */}
          <div className="lg:col-span-1 bg-card border border-border rounded-lg p-5 h-fit sticky top-24">
             <h3 className="text-sm font-bold text-primary tracking-widest uppercase flex items-center gap-2 border-b border-border pb-3 mb-4"><Clock className="w-4 h-4"/> My Logistics Record</h3>
             
             {!userId ? (
               <p className="text-xs text-muted-foreground text-center py-4">Authenticate to view records.</p>
             ) : myRequests.length === 0 ? (
               <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded">No active requests.</p>
             ) : (
               <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
                 {myRequests.map(req => (
                   <div key={req.id} className="flex flex-col gap-1 border border-border bg-background p-3 rounded">
                     <span className="text-xs font-bold text-foreground">{req.inventory_items?.name}</span>
                     <div className="flex justify-between items-end mt-2">
                       <span className="text-[10px] text-muted-foreground">QTY: {req.quantity}</span>
                       <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${getStatusStyle(req.status)}`}>{req.status}</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
          
        </div>
      )}
    </div>
  );
}