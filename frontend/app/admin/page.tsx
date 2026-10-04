'use client';
import { useState } from 'react';

export default function AdminDashboard() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [symbolFile, setSymbolFile] = useState<File | null>(null);
  const [footprintFile, setFootprintFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('tags', tags);
    formData.append('admin_secret', adminSecret || process.env.NEXT_PUBLIC_ADMIN_SECRET || '');
    if (previewImage) formData.append('preview_image', previewImage);
    if (symbolFile) formData.append('symbol_file', symbolFile);
    if (footprintFile) formData.append('footprint_file', footprintFile);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/admin/components`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setMessage('Component created successfully! ✅');
        setName('');
        setDescription('');
        setTags('');
        setPreviewImage(null);
        setSymbolFile(null);
        setFootprintFile(null);
      } else {
        const error = await res.json();
        setMessage(`Error: ${error.detail}`);
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500 relative z-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-3 text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 font-medium text-lg">Securely upload new PCB footprints and symbols to the platform.</p>
      </div>

      {message && (
        <div className={`p-5 rounded-2xl mb-8 font-bold shadow-sm border ${message.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-8">
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
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Preview Image (PNG/JPG)</label>
            <input type="file" accept="image/*" onChange={e => setPreviewImage(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Schematic Symbol (.lib)</label>
            <input type="file" onChange={e => setSymbolFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">PCB Footprint (.kicad_mod)</label>
            <input type="file" onChange={e => setFootprintFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer transition-colors" />
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Admin Secret Key</label>
          <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Enter admin password to verify" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg tracking-wide rounded-xl shadow-xl shadow-slate-900/20 transition-all disabled:opacity-50 active:scale-95">
          {loading ? 'Processing Upload...' : 'Deploy Component'}
        </button>
      </form>
    </div>
  );
}