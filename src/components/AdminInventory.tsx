import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, AlertCircle, Plus, Save } from 'lucide-react';

export default function AdminInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Flight Controllers', description: '', storage_location: '', minimum_stock: 2, total_quantity: 1 });

  const categories = ['Flight Controllers', 'ESCs', 'Motors', 'Frames', 'Propellers', 'Batteries', 'GPS', 'Receivers', 'Cameras', 'Sensors', 'Radio Equipment', 'Tools', 'Electronics', 'Miscellaneous'];

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    const { data: iData } = await supabase.from('inventory_items').select('*');
    if (iData) setItems(iData);
    const { data: rData } = await supabase.from('inventory_requests').select('*, inventory_items(name)').eq('status', 'Pending');
    if (rData) setRequests(rData);
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('inventory_items').insert([{ ...newItem, available_quantity: newItem.total_quantity, status: 'Active' }]);
    setShowForm(false);
    fetchData();
  };

  return (
    <div className="flex flex-col gap-8 font-mono w-full animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center shadow-sm">
          <span className="text-[10px] text-muted-foreground tracking-widest mb-1">TOTAL ASSETS</span>
          <span className="text-3xl font-bold text-primary">{items.length}</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all rounded-lg flex flex-col items-center justify-center text-primary group">
          <Plus className="w-8 h-8 mb-1" />
          <span className="text-[10px] tracking-widest">DEPLOY NEW ASSET</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddAsset} className="bg-muted/30 border border-border rounded-lg p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-primary tracking-widest uppercase">Initialize Component</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required placeholder="COMPONENT NAME" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded" />
            <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="bg-background border border-border focus:border-primary p-2 text-sm rounded">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 flex justify-center items-center gap-2 text-xs tracking-widest w-fit">
            <Save className="w-4 h-4" /> COMMIT TO DB
          </button>
        </form>
      )}
    </div>
  );
}