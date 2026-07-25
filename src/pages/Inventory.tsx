import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, AlertCircle, Plus } from 'lucide-react';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase.from('inventory_items').select('*').order('name');
    if (!error && data) setItems(data);
    setLoading(false);
  };

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-8 font-mono animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-primary uppercase">/ Logistics / Inventory</h1>
          <p className="text-muted-foreground mt-2 text-sm tracking-widest">AEROFORGE SQUADRON ASSET MANAGEMENT</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="SEARCH COMPONENTS..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary rounded-md py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-primary animate-pulse tracking-widest">INITIALIZING INVENTORY MATRIX...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="group bg-card border border-border rounded-lg p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all hover:border-primary/50">
              <div className="flex justify-between items-start">
                <span className="text-xs text-primary font-bold uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                  {item.category}
                </span>
                {item.available_quantity < item.minimum_stock && <AlertCircle className="w-4 h-4 text-destructive" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-card-foreground">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">LOC: {item.storage_location || 'UNASSIGNED'}</p>
              </div>
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-border">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground tracking-widest">AVAILABLE</span>
                  <span className={`text-xl font-bold ${item.available_quantity > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {item.available_quantity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}