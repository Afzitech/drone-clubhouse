import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, AlertCircle, Plus, Save } from 'lucide-react';

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // New Asset Form State
  const [newItem, setNewItem] = useState({
    name: '', category: 'Flight Controllers', description: '', 
    storage_location: '', minimum_stock: 2, total_quantity: 1
  });

  const categories = ['Flight Controllers', 'ESCs', 'Motors', 'Frames', 'Propellers', 'Batteries', 'GPS', 'Receivers', 'Cameras', 'Sensors', 'Radio Equipment', 'Tools', 'Electronics', 'Miscellaneous'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: itemsData } = await supabase.from('inventory_items').select('*').order('name');
    if (itemsData) setItems(itemsData);

    const { data: reqData } = await supabase.from('inventory_requests')
      .select('*, inventory_items(name)')
      .eq('status', 'Pending');
    if (reqData) setRequests(reqData);
    
    setLoading(false);
  };

  const handleRequest = async (id: string, newStatus: string) => {
    await supabase.from('inventory_requests').update({ status: newStatus }).eq('id', id);
    fetchData(); 
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const assetToInsert = {
      ...newItem,
      available_quantity: newItem.total_quantity,
      status: 'Active'
    };
    
    await supabase.from('inventory_items').insert([assetToInsert]);
    setShowForm(false);
    setNewItem({ name: '', category: 'Flight Controllers', description: '', storage_location: '', minimum_stock: 2, total_quantity: 1 });
    fetchData();
  };

  if (loading) return <div className="text-cyan-500 animate-pulse font-mono tracking-widest p-6">LINKING TO LOGISTICS MAINFRAME...</div>;

  return (
    <div className="flex flex-col gap-8 font-mono text-cyan-50 w-full">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-4 flex flex-col items-center">
          <span className="text-[10px] text-slate-500 tracking-widest mb-1">TOTAL ASSETS</span>
          <span className="text-3xl font-bold text-cyan-400">{items.length}</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-4 flex flex-col items-center">
          <span className="text-[10px] text-slate-500 tracking-widest mb-1">PENDING QUEUE</span>
          <span className="text-3xl font-bold text-yellow-400">{requests.length}</span>
        </div>
        <div className="bg-slate-900/50 border border-red-900/30 p-4 flex flex-col items-center">
          <span className="text-[10px] text-red-500 tracking-widest mb-1">CRITICAL STOCK</span>
          <span className="text-3xl font-bold text-red-500">
            {items.filter(i => i.available_quantity <= i.minimum_stock).length}
          </span>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-cyan-950/30 border border-cyan-900 hover:bg-cyan-900/50 hover:border-cyan-400 transition-all flex flex-col items-center justify-center group"
        >
          <Plus className="w-8 h-8 text-cyan-500 group-hover:text-cyan-300 mb-1" />
          <span className="text-[10px] text-cyan-500 group-hover:text-cyan-300 tracking-widest">DEPLOY NEW ASSET</span>
        </button>
      </div>

      {/* Asset Deployment Form (Conditional) */}
      {showForm && (
        <form onSubmit={handleAddAsset} className="bg-slate-900/80 border border-cyan-900/50 p-6 flex flex-col gap-4 relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-500 to-transparent" />
          <h3 className="text-sm font-bold text-cyan-400 tracking-widest uppercase mb-2">Initialize New Component</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required placeholder="COMPONENT NAME" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="bg-slate-950 border border-slate-800 focus:border-cyan-500 p-2 text-sm outline-none" />
            <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="bg-slate-950 border border-slate-800 focus:border-cyan-500 p-2 text-sm outline-none text-cyan-100">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="STORAGE LOCATION (e.g. Hangar A)" value={newItem.storage_location} onChange={e => setNewItem({...newItem, storage_location: e.target.value})} className="bg-slate-950 border border-slate-800 focus:border-cyan-500 p-2 text-sm outline-none" />
            <input type="text" placeholder="DESCRIPTION / SPECS" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="bg-slate-950 border border-slate-800 focus:border-cyan-500 p-2 text-sm outline-none" />
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 tracking-widest">TOTAL QTY</label>
                <input type="number" min="1" required value={newItem.total_quantity} onChange={e => setNewItem({...newItem, total_quantity: parseInt(e.target.value)})} className="bg-slate-950 border border-slate-800 focus:border-cyan-500 p-2 text-sm outline-none" />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 tracking-widest">MIN STOCK ALARM</label>
                <input type="number" min="0" required value={newItem.minimum_stock} onChange={e => setNewItem({...newItem, minimum_stock: parseInt(e.target.value)})} className="bg-slate-950 border border-slate-800 focus:border-cyan-500 p-2 text-sm outline-none" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-700 text-slate-400 hover:bg-slate-800 text-xs tracking-widest">CANCEL</button>
            <button type="submit" className="px-4 py-2 bg-cyan-950 text-cyan-400 border border-cyan-800 hover:bg-cyan-900 transition-all flex items-center gap-2 text-xs tracking-widest">
              <Save className="w-4 h-4" /> COMMIT TO DB
            </button>
          </div>
        </form>
      )}

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
                  <button onClick={() => handleRequest(req.id, 'Approved')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-950/20 text-green-400 border border-green-900/50 hover:bg-green-900 transition-all text-xs tracking-widest">
                    <Check className="w-4 h-4" /> APPROVE
                  </button>
                  <button onClick={() => handleRequest(req.id, 'Rejected')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-950/20 text-red-400 border border-red-900/50 hover:bg-red-900 transition-all text-xs tracking-widest">
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
