'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ComponentDetails() {
  const { id } = useParams();
  const [comp, setComp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComponent = async () => {
      const { data } = await supabase.from('components').select('*').eq('id', id).single();
      setComp(data);
      setLoading(false);
    };
    if (id) fetchComponent();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl font-bold text-slate-500">Loading Component...</div>;
  if (!comp) return <div className="min-h-screen flex items-center justify-center text-xl font-bold text-red-500">Component Not Found</div>;

  const mainPreview = comp.symbol_preview_url || comp.footprint_preview_url;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold mb-6 inline-flex items-center gap-2">
        &larr; Back to Library
      </Link>

      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Left Side: Info */}
        <div className="w-full xl:w-1/3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-64">
             {mainPreview ? (
               <img src={mainPreview} alt={comp.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
             ) : (
               <p className="text-slate-400">No Image Available</p>
             )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{comp.name}</h1>
            <p className="mt-4 text-slate-600 leading-relaxed text-sm md:text-base">{comp.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {comp.tags?.split(',').map((tag: string, index: number) => (
              <span key={index} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">
                {tag.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: SnapMagic Style Previews */}
        <div className="w-full xl:w-2/3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-4">
            <span className="font-bold text-slate-900 border-b-2 border-blue-600 pb-1">Symbol and Footprint</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Symbol Box */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-white px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Symbol</h3>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 min-h-[250px] bg-slate-50">
                {comp.symbol_preview_url ? (
                  <img src={comp.symbol_preview_url} alt="Symbol" className="max-h-56 object-contain mix-blend-multiply" />
                ) : (
                  <p className="text-slate-400 font-medium text-sm">Not Available</p>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <a 
                  href={comp.symbol_file_url || '#'} 
                  target={comp.symbol_file_url ? "_blank" : "_self"}
                  className={`block w-full text-center font-bold py-3 rounded-lg transition-colors border ${comp.symbol_file_url ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                >
                  Download Symbol
                </a>
              </div>
            </div>

            {/* Footprint Box (Dark Background) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Footprint</h3>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">2D Model</span>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 min-h-[250px] bg-slate-900 relative">
                {/* Grid overlay for SnapEDA look */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                {comp.footprint_preview_url ? (
                  <img src={comp.footprint_preview_url} alt="Footprint" className="max-h-56 object-contain relative z-10" />
                ) : (
                  <p className="text-slate-500 font-medium text-sm relative z-10">Not Available</p>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100">
                <a 
                  href={comp.footprint_file_url || '#'} 
                  target={comp.footprint_file_url ? "_blank" : "_self"}
                  className={`block w-full text-center font-bold py-3 rounded-lg transition-colors border ${comp.footprint_file_url ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white' : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                >
                  Download Footprint
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}