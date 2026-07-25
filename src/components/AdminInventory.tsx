import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, AlertCircle, Plus, Save, Trash2, Package, Minus } from 'lucide-react';

export default function AdminInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Flight Controllers', description: '', storage_location: '', minimum_stock: 2, total_quantity: 1 });

  const categories = ['Flight Controllers', 'ESCs', 'Motors', 'Frames', 'Propellers', 'Batteries', 'GPS', 'Receivers', 'Cameras', 'Sensors', 'Radio Equipment', 'Tools', 'Electronics', 'Miscellaneous'];

  useEffect(() => { fetchData(); }, []);
  
  const fetchData = async () => {
    const { data: iData } = await supabase.from('inventory_items').select('*').order('name');
    if (iData) setItems(iData);
    const { data: rData } = await supabase.from('inventory_requests').select('*, inventory_items(name)').eq('status', 'Pending');
    if (rData) setRequests(rData);
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('inventory_items').insert([{ ...newItem, available_quantity: newItem.total_quantity, status: 'Active' }]);
    setShowForm(false);
    setNewItem({ name: '', category: 'Flight Controllers', description: '', storage_location: '', minimum_stock: 2, total_quantity: 1 });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if(confirm('Delete this asset from the mainframe?')) {
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
    await supabase.from('inventory_requests').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  return (
    <div className="flex flex-col gap-8 font-mono w-full animate-in fade-in">
      {/* 1. HUD Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center shadow-sm">
          <span className="text-[10px] text-muted-foreground tracking-widest mb-1">TOTAL ASSETS</span>
          <span className="text-3xl font-bold text-primary">{items.length}</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center shadow-sm">
          <span className="text-[10px] text-muted-foreground tracking-widest mb-1">PENDING REQUESTS</span>
          <span className="text-3xl font-bold text-yellow-500">{requests.length}</span>
        </div>
        <div className="bg-card border border-destructive/30 rounded-lg p-4 flex flex-col items-center shadow-sm">
          <span className="text-[10px] text-destructive tracking-widest mb-1">CRITICAL STOCK</span>
          <span className="text-3xl font-bold text-destructive">
            {items.filter(i => i.available_quantity <= i.minimum_stock).length}
          </span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all rounded-lg flex flex-col items-center justify-center text-primary group">
          <Plus className="w-8 h-8 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] tracking-widest">DEPLOY NEW ASSET</span>
        </button>
      </div>

      {/* 2. Asset Deployment Form */}
      {showForm && (
        <form onSubmit={handleAddAsset} className="bg-card border border-primary/50 rounded-lg p-6 flex flex-col gap-4 shadow-md">
          <h3 className="text-sm font-bold text-primary tracking-widest uppercase flex items-center gap-2"><Package className="w-4 h-4"/> Initialize Component</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input type="text" required placeholder="COMPONENT NAME" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none" />
            <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none text-foreground">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="LOCATION (e.g. Bin 1)" value={newItem.storage_location} onChange={e => setNewItem({...newItem, storage_location: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded outline-none" />
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
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center gap-2 text-xs tracking-widest">
              <Save className="w-4 h-4" /> COMMIT TO DB
            </button>
          </div>
        </form>
      )}

      {/* 3. Requisition Queue */}
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
         <h3 className="text-sm font-bold text-primary tracking-widest uppercase flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Requisition Queue</h3>
         {requests.length === 0 ? (
           <div className="text-muted-foreground text-xs p-4 border border-dashed border-border rounded text-center tracking-widest">QUEUE CLEAR. NO PENDING SUBMISSIONS.</div>
         ) : (
           <div className="flex flex-col gap-2">
             {requests.map(req => (
               <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-background border border-border p-3 rounded">
                 <div>
                   <span className="font-bold text-foreground block">{req.inventory_items?.name}</span>
                   <span className="text-xs text-muted-foreground">QTY: {req.quantity} | REASON: {req.reason || 'N/A'}</span>
                 </div>
                 <div className="flex gap-2 mt-3 md:mt-0">
                   <button onClick={() => handleRequest(req.id, 'Approved')} className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded text-xs hover:bg-green-500/20 flex items-center gap-1 uppercase tracking-widest"><Check className="w-3 h-3"/> Approve</button>
                   <button onClick={() => handleRequest(req.id, 'Rejected')} className="bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 rounded text-xs hover:bg-destructive/20 flex items-center gap-1 uppercase tracking-widest"><X className="w-3 h-3"/> Deny</button>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* 4. Asset Management Matrix */}
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
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Delete Asset">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}