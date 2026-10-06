'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  
  const [symbolPreview, setSymbolPreview] = useState<File | null>(null);
  const [footprintPreview, setFootprintPreview] = useState<File | null>(null);
  
  const [symbolFile, setSymbolFile] = useState<File | null>(null);
  const [footprintFile, setFootprintFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [components, setComponents] = useState<any[]>([]);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    const { data } = await supabase.from('components').select('*').order('id', { ascending: false });
    setComponents(data || []);
  };

  const extractPath = (url: string | null) => {
    if (!url) return null;
    const parts = url.split('/pcb_components/');
    return parts.length > 1 ? parts[1] : null;
  };

  const handleDeleteComponent = async (comp: any) => {
    const secret = prompt('Enter Delete Secret Code:');
    if (secret !== process.env.NEXT_PUBLIC_DELETE_SECRET_CODE) {
      alert('Incorrect Secret Code');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete ${comp.name} and its files?`)) {
      try {
        const paths = [
          extractPath(comp.symbol_preview_url),
          extractPath(comp.footprint_preview_url),
          extractPath(comp.symbol_file_url),
          extractPath(comp.footprint_file_url)
        ].filter(Boolean) as string[];

        if (paths.length > 0) {
          await supabase.storage.from('pcb_components').remove(paths);
        }

        const { error } = await supabase.from('components').delete().eq('id', comp.id);
        if (error) throw error;

        alert('Component deleted successfully!');
        fetchComponents();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const secret = adminSecret || process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (secret !== process.env.NEXT_PUBLIC_ADMIN_SECRET) {
      setMessage('Error: Invalid admin secret.');
      setLoading(false);
      return;
    }

    try {
      const uploadFile = async (file: File) => {
        const fileName = `${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('pcb_components').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('pcb_components').getPublicUrl(fileName);
        return data.publicUrl;
      };

      let symbol_prev_url = null;
      let footprint_prev_url = null;
      let symbol_url = null;
      let footprint_url = null;

      if (symbolPreview) symbol_prev_url = await uploadFile(symbolPreview);
      if (footprintPreview) footprint_prev_url = await uploadFile(footprintPreview);
      if (symbolFile) symbol_url = await uploadFile(symbolFile);
      if (footprintFile) footprint_url = await uploadFile(footprintFile);

      const { error } = await supabase.from('components').insert([{
        name,
        description,
        tags,
        symbol_preview_url: symbol_prev_url,
        footprint_preview_url: footprint_prev_url,
        symbol_file_url: symbol_url,
        footprint_file_url: footprint_url
      }]);

      if (error) throw error;

      setMessage('Component created successfully! 🎉');
      setName('');
      setDescription('');
      setTags('');
      setSymbolPreview(null);
      setFootprintPreview(null);
      setSymbolFile(null);
      setFootprintFile(null);
      fetchComponents();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500 relative z-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-3 text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 font-medium text-lg">Securely upload or delete PCB footprints and symbols.</p>
      </div>

      {message && (
        <div className={`p-5 rounded-2xl mb-8 font-bold shadow-sm border ${message.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-8 mb-16">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Component Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="e.g. ESP32-WROOM-32" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Detailed description of the component..."></textarea>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Tags (comma separated)</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Microcontroller, Wi-Fi, SMD" />
        </div>

        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Symbol Preview (Img)</label>
            <input type="file" accept="image/*" onChange={e => setSymbolPreview(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors" />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Footprint Preview (Img)</label>
            <input type="file" accept="image/*" onChange={e => setFootprintPreview(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors" />
          </div>
          
          {/* Files Section */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Schematic Symbol (.lib)</label>
            <input type="file" onChange={e => setSymbolFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer transition-colors" />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">PCB Footprint (.kicad_mod)</label>
            <input type="file" onChange={e => setFootprintFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer transition-colors" />
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Admin Secret Key (Upload)</label>
          <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Enter admin password to verify upload" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg tracking-wide rounded-xl shadow-xl shadow-slate-900/20 transition-all disabled:opacity-50 active:scale-95">
          {loading ? 'Processing Upload...' : 'Deploy Component'}
        </button>
      </form>

      {/* DELETE SECTION */}
      <div className="mt-16">
        <h2 className="text-3xl font-black mb-6 text-slate-900 tracking-tight">Manage Components</h2>
        <div className="space-y-4">
          {components.length > 0 ? components.map(comp => (
            <div key={comp.id} className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="pr-4">
                <h3 className="text-xl font-bold text-slate-800">{comp.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{comp.description?.substring(0, 60)}...</p>
              </div>
              <button 
                onClick={() => handleDeleteComponent(comp)}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold rounded-xl transition-colors border border-red-100 flex-shrink-0"
              >
                Delete
              </button>
            </div>
          )) : (
            <p className="text-slate-500 font-medium text-center py-8">No components found.</p>
          )}
        </div>
      </div>
    </div>
  );
}