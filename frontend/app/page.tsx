'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [components, setComponents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComponents();
  }, [search]);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      let query = supabase.from('components').select('*').order('id', { ascending: false });
      if (search) {
        query = query.or(`name.ilike.%${search}%,tags.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Supabase fetch error:", error);
      }
      setComponents(data || []);
    } catch (err) {
      console.error("Fetch exception:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 relative z-10">
      {/* Hero Search Section */}
      <div className="text-center space-y-6 py-16 px-4 bg-white/40 border border-white backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-emerald-50 opacity-50"></div>
        <div className="relative z-10">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 leading-tight">
              Find Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">Component</span>
            </h1>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mt-4 font-medium leading-relaxed">
              High-quality PCB footprints and schematic symbols for your electronic designs, curated by the community.
            </p>
            
            <div className="max-w-2xl mx-auto mt-10 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <input 
                type="text" 
                placeholder="Search by name (e.g. ESP32, NE555) or tags..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="relative w-full bg-white border border-slate-200 rounded-full py-5 px-8 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-lg font-medium transition-all"
              />
            </div>
        </div>
      </div>

      {/* Components Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold text-xl">
          Loading components...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {components.map(comp => {
            // Priority: Real Component Hardware Photo -> Symbol -> Footprint
            const displayImage = comp.component_image_url || comp.symbol_preview_url || comp.footprint_preview_url;
            
            return (
              <Link href={`/components/${comp.id}`} key={comp.id} className="group block">
                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1">
                  <div className="h-56 bg-slate-50 relative flex items-center justify-center border-b border-slate-100 p-4">
                    {displayImage ? (
                      <img src={displayImage} alt={comp.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-medium">No Image Available</div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight group-hover:text-blue-600 transition-colors">{comp.name}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{comp.description}</p>
                    {comp.tags && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {comp.tags.split(',').map((tag: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-slate-100 border border-slate-200 text-xs font-semibold rounded-md text-slate-600 tracking-wide">{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {components.length === 0 && (
            <div className="col-span-full text-center text-slate-400 py-16 font-medium text-lg">
              No components found. Go to Admin page to deploy components!
            </div>
          )}
        </div>
      )}
    </div>
  );
}