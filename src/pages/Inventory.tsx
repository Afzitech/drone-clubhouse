import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Box, AlertCircle, Plus } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50 p-8 font-mono">
      {/* Header Module */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] uppercase">
            / Logistics / Inventory
          </h1>
          <p className="text-slate-400 mt-2 text-sm tracking-widest">AEROFORGE SQUADRON ASSET MANAGEMENT</p>
        </div>

        {/* Search & Action Bar */}
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50 w-4 h-4" />
            <input 
              type="text" 
              placeholder="SEARCH COMPONENTS..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-900 focus:border-cyan-400 rounded-none py-2 pl-10 pr-4 text-sm text-cyan-100 placeholder-cyan-800 outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            />
          </div>
          <button className="bg-slate-900 border border-cyan-900 hover:border-cyan-400 text-cyan-400 px-4 py-2 flex items-center gap-2 text-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Filter className="w-4 h-4" /> FILTER
          </button>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="text-cyan-500 animate-pulse tracking-widest">INITIALIZING INVENTORY MATRIX...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="group bg-slate-900/50 border border-slate-800 p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)] hover:bg-slate-900"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent group-hover:via-cyan-400 transition-all duration-500" />
              
              <div className="flex justify-between items-start">
                <span className="text-xs text-cyan-600 font-bold uppercase tracking-widest bg-cyan-950/30 px-2 py-1">
                  {item.category}
                </span>
                {item.available_quantity < item.minimum_stock && (
                  <AlertCircle className="w-4 h-4 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">{item.name}</h3>
                <p className="text-xs text-slate-500 mt-1">LOC: {item.storage_location || 'UNASSIGNED'}</p>
              </div>

              <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 tracking-widest">AVAILABLE</span>
                  <span className={`text-xl font-bold ${item.available_quantity > 0 ? 'text-cyan-400' : 'text-red-500'}`}>
                    {item.available_quantity}
                  </span>
                </div>
                
                <button 
                  disabled={item.available_quantity === 0}
                  className="bg-cyan-950/40 text-cyan-300 border border-cyan-900 px-4 py-2 text-xs uppercase tracking-widest hover:bg-cyan-900 hover:text-cyan-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {item.available_quantity > 0 ? 'Request' : 'Procure'}
                </button>
              </div>
            </div>
          ))}

          <div className="bg-slate-900/30 border border-dashed border-slate-700 p-5 flex flex-col items-center justify-center gap-3 text-center transition-all duration-300 hover:border-cyan-500/50 hover:bg-slate-900/50 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-cyan-950/50 flex items-center justify-center">
              <Plus className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-cyan-400 tracking-wide">COMPONENT NOT FOUND?</h3>
              <p className="text-xs text-slate-500 mt-1">Submit a procurement request to Command.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
