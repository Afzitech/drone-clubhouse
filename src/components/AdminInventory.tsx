import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, AlertCircle, Plus, Save, Trash2, Package, Minus, RotateCcw } from 'lucide-react';

export default function AdminInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewState, setViewState] = useState<'active' | 'history'>('active');
  const [newItem, setNewItem] = useState({ name: '', category: 'Flight Controllers', description: '', storage_location: '', minimum_stock: 2, total_quantity: 1 });

  const categories = ['Flight Controllers', 'ESCs', 'Motors', 'Frames', 'Propellers', 'Batteries', 'GPS', 'Receivers', 'Cameras', 'Sensors', 'Radio Equipment', 'Tools', 'Electronics', 'Miscellaneous', 'Custom Request'];

  useEffect(() => { fetchData(); }, []);
  
  const fetchData = async () => {
    const { data: iData, error: iError } = await supabase.from('inventory_items').select('*').order('name');
    if (iError) alert("ADMIN DB ERROR (Items): " + iError.message);
    else if (iData) setItems(iData);

    const { data: rData, error: rError } = await supabase.from('inventory_requests').select('*, inventory_items(name)').not('item_id', 'is', null).order('created_at', { ascending: false });
    if (rError) alert("ADMIN DB ERROR (Requests): " + rError.message);
    else if (rData) setRequests(rData);
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('inventory_items').insert([{ ...newItem, available_quantity: newItem.total_quantity, status: 'Active' } as any]);
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if(confirm('Purge this asset from the database?')) {
      await supabase.from('inventory_items').delete().eq('id', id);
      fetchData();
    }
  };

  const adjustStock = async (id: string, current: number, amount: number) => {
    const newQty = Math.max(0, current + amount);
    await supabase.from('inventory_items').update({ available_quantity: newQty, total_quantity: newQty }).eq('id', id);
    fetchData();
  };

  const handleRequest = async (id: string, newStatus: string) => {
    await supabase.from('inventory_requests').update({ status: newStatus as any }).eq('id', id);
    fetchData();
  };

  // ADMIN ONLY DELETION LOGIC
  const handleDeleteRequest = async (id: string) => {
    if(confirm('Permanently purge this record from history?')) {
      const { error } = await supabase.from('inventory_requests').delete().eq('id', id);
      if (error) alert("DELETE ERROR: " + error.message);
      else fetchData();
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const activeDeployments = requests.filter(r => r.status === 'Approved');
  const historicalRequests = requests.filter(r => r.status === 'Rejected' || r.status === 'Returned');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', storage_location: '' });

  const openEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({ name: item.name, category: item.category, storage_location: item.storage_location || '' });
  };

  const saveEdit = async () => {
    const { error } = await supabase.from('inventory_items').update(editForm as any).eq('id', editingItem.id);
    if (error) alert("UPDATE ERROR: " + error.message);
    else {
      setEditingItem(null);
      window.location.reload(); // Hard refresh to ensure matrix syncs perfectly
    }
  };

  return (
    <div className="flex flex-col gap-8 font-mono w-full animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center shadow-sm">
          <span className="text-[10px] text-muted-foreground tracking-widest mb-1">TOTAL ASSETS</span>
          <span className="text-3xl font-bold text-primary">{items.length}</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center shadow-sm">
          <span className="text-[10px] text-muted-foreground tracking-widest mb-1">PENDING REQUESTS</span>
          <span className="text-3xl font-bold text-yellow-500">{pendingRequests.length}</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center shadow-sm">
          <span className="text-[10px] text-muted-foreground tracking-widest mb-1">FIELD DEPLOYMENTS</span>
          <span className="text-3xl font-bold text-cyan-500">{activeDeployments.length}</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all rounded-lg flex flex-col items-center justify-center text-primary">
          <Plus className="w-8 h-8 mb-1" />
          <span className="text-[10px] tracking-widest">DEPLOY NEW ASSET</span>
        </button>
      </div>

      {showForm && (
         <form onSubmit={handleAddAsset} className="bg-card border border-primary/50 rounded-lg p-6 flex flex-col gap-4">
         <h3 className="text-sm font-bold text-primary tracking-widest uppercase flex items-center gap-2"><Package className="w-4 h-4"/> Initialize Component</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <input type="text" required placeholder="COMPONENT NAME" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none" />
           <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none text-foreground">
             {categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <input type="text" placeholder="LOCATION" value={newItem.storage_location} onChange={e => setNewItem({...newItem, storage_location: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none" />
           <div className="flex gap-2">
             <div className="flex-1">
               <label className="text-[10px] text-muted-foreground block mb-1">TOTAL QTY</label>
               <input type="number" min="1" required value={newItem.total_quantity} onChange={e => setNewItem({...newItem, total_quantity: parseInt(e.target.value)})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none w-full" />
             </div>
             <div className="flex-1">
               <label className="text-[10px] text-muted-foreground block mb-1">MIN STOCK</label>
               <input type="number" min="0" required value={newItem.minimum_stock} onChange={e => setNewItem({...newItem, minimum_stock: parseInt(e.target.value)})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none w-full" />
             </div>
           </div>
         </div>
         <div className="flex justify-end gap-2 mt-2">
           <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border text-muted-foreground hover:bg-muted rounded text-xs tracking-widest">CANCEL</button>
           <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center gap-2 text-xs tracking-widest"><Save className="w-4 h-4" /> COMMIT</button>
         </div>
       </form>
      )}

      <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-border pb-2">
           <h3 className="text-sm font-bold text-primary tracking-widest uppercase flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Logistics Queue</h3>
           <div className="flex gap-2">
             <button onClick={() => setViewState('active')} className={`text-xs uppercase tracking-widest px-3 py-1 rounded transition-colors ${viewState === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Active ({pendingRequests.length + activeDeployments.length})</button>
             <button onClick={() => setViewState('history')} className={`text-xs uppercase tracking-widest px-3 py-1 rounded transition-colors ${viewState === 'history' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>History ({historicalRequests.length})</button>
           </div>
        </div>

        <div className="flex flex-col gap-3">
          {viewState === 'active' && [...pendingRequests, ...activeDeployments].map(req => (
            <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-background border border-border p-3 rounded">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{req.inventory_items?.name || "CUSTOM REQUEST"}</span>
                  <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${req.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'}`}>{req.status}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">PILOT: <span className="text-foreground font-bold">{req.requester_name || "UNKNOWN"}</span> | QTY: {req.quantity} | NOTES: {req.reason || 'N/A'}</span>
              </div>
              <div className="flex gap-2 mt-3 md:mt-0">
                {req.status === 'Pending' ? (
                  <>
                    <button onClick={() => handleRequest(req.id, 'Approved')} className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded text-xs hover:bg-green-500/20 flex items-center gap-1 uppercase tracking-widest"><Check className="w-3 h-3"/> Approve</button>
                    <button onClick={() => handleRequest(req.id, 'Rejected')} className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 rounded text-xs hover:bg-destructive/20 flex items-center gap-1 uppercase tracking-widest"><X className="w-3 h-3"/> Deny</button>
                  </>
                ) : (
                  <button onClick={() => handleRequest(req.id, 'Returned')} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded text-xs hover:bg-primary/20 flex items-center gap-1 uppercase tracking-widest"><RotateCcw className="w-3 h-3"/> Return</button>
                )}
              </div>
            </div>
          ))}
          {viewState === 'active' && pendingRequests.length === 0 && activeDeployments.length === 0 && (
            <div className="text-muted-foreground text-xs p-4 text-center tracking-widest border border-dashed border-border rounded">QUEUE CLEAR.</div>
          )}
          
          {viewState === 'history' && historicalRequests.map(req => (
            <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-background border border-border p-3 rounded opacity-70 group hover:opacity-100 transition-all">
              <div>
                 <span className="font-bold text-muted-foreground group-hover:text-foreground transition-colors">{req.inventory_items?.name || "CUSTOM REQUEST"}</span>
                 <span className="text-xs text-muted-foreground mt-1 block">PILOT: {req.requester_name || "UNKNOWN"} | QTY: {req.quantity} | STATUS: {req.status}</span>
              </div>
              <div className="mt-3 md:mt-0">
                {/* ADMIN ONLY TRASH BUTTON */}
                <button onClick={() => handleDeleteRequest(req.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Purge Record from History">
                  <Trash2 className="w-4 h-4 inline" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4 overflow-hidden">
        <h3 className="text-sm font-bold text-primary tracking-widest uppercase flex items-center gap-2"><Package className="w-4 h-4"/> Asset Management Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-widest">
                <th className="pb-3 font-medium">Component</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium text-center">Stock</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(item => (
                <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <span className="block font-bold text-foreground">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">LOC: {item.storage_location || 'UNASSIGNED'}</span>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground pr-4 uppercase">{item.category}</td>
                  <td className="py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => adjustStock(item.id, item.available_quantity, -1)} className="p-1 hover:bg-muted rounded text-muted-foreground border border-transparent hover:border-border transition-all"><Minus className="w-3 h-3"/></button>
                      <span className={`font-bold w-6 text-center ${item.available_quantity <= item.minimum_stock ? 'text-destructive' : 'text-foreground'}`}>{item.available_quantity}</span>
                      <button onClick={() => adjustStock(item.id, item.available_quantity, 1)} className="p-1 hover:bg-muted rounded text-muted-foreground border border-transparent hover:border-border transition-all"><Plus className="w-3 h-3"/></button>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => openEdit(item)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors mr-1" title="Edit Asset">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Delete Asset"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    
      {editingItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-primary/50 p-6 rounded-lg w-full max-w-md flex flex-col gap-4 font-mono shadow-[0_0_20px_rgba(0,255,255,0.1)]">
            <h3 className="text-primary font-bold tracking-widest uppercase border-b border-border pb-2">Edit Asset Data</h3>
            <div className="flex flex-col gap-3">
              <label className="text-xs text-muted-foreground uppercase">Component Name</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none w-full" />
              
              <label className="text-xs text-muted-foreground uppercase mt-2">Category</label>
              <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none w-full">
                <option value="Flight Controllers">Flight Controllers</option>
                <option value="Motors & ESCs">Motors & ESCs</option>
                <option value="Power Systems">Power Systems</option>
                <option value="Frames & Hardware">Frames & Hardware</option>
                <option value="Sensors & Radios">Sensors & Radios</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>

              <label className="text-xs text-muted-foreground uppercase mt-2">Storage Location</label>
              <input type="text" value={editForm.storage_location} onChange={e => setEditForm({...editForm, storage_location: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none w-full" placeholder="e.g. BIN A4, SHELF 2" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-2 border border-border text-muted-foreground hover:bg-muted rounded text-xs uppercase tracking-widest transition-all">Cancel</button>
              <button onClick={saveEdit} className="flex-1 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded text-xs uppercase tracking-widest transition-all">Save Matrix</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Forced Deploy Trigger: 1785227182532