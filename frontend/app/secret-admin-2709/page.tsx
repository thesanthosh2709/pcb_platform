'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ImageCropModal from '@/components/ImageCropModal';

// 1. Strict Types
interface ComponentRecord {
  id: string | number;
  name: string;
  description: string;
  tags: string;
  component_image_url?: string | null;
  symbol_preview_url?: string | null;
  footprint_preview_url?: string | null;
  symbol_file_url?: string | null;
  footprint_file_url?: string | null;
}

type CropTarget = 'componentImage' | 'symbolPreview' | 'footprintPreview' | null;

export default function AdminDashboard() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  
  const [componentImage, setComponentImage] = useState<File | null>(null);
  const [symbolPreview, setSymbolPreview] = useState<File | null>(null);
  const [footprintPreview, setFootprintPreview] = useState<File | null>(null);
  
  const [symbolFile, setSymbolFile] = useState<File | null>(null);
  const [footprintFile, setFootprintFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [components, setComponents] = useState<ComponentRecord[]>([]);

  // Crop State
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');

  // Edit State
  const [editingComponentId, setEditingComponentId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    const { data } = await supabase.from('components').select('*').order('id', { ascending: false });
    if (data) {
      setComponents(data as ComponentRecord[]);
    }
  };

  const handleFileSelectForCrop = (e: React.ChangeEvent<HTMLInputElement>, target: CropTarget) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || '');
        setCropTarget(target);
      });
      reader.readAsDataURL(file);
      e.target.value = ''; // reset so same file can trigger change
    }
  };

  const handleCropApply = (croppedFile: File) => {
    if (cropTarget === 'componentImage') setComponentImage(croppedFile);
    if (cropTarget === 'symbolPreview') setSymbolPreview(croppedFile);
    if (cropTarget === 'footprintPreview') setFootprintPreview(croppedFile);
    setCropTarget(null);
    setCropImageSrc('');
  };

  const extractPath = (url: string | null | undefined) => {
    if (!url) return null;
    const parts = url.split('/pcb_components/');
    return parts.length > 1 ? parts[1] : null;
  };

  const handleDeleteComponent = async (comp: ComponentRecord) => {
    const secret = window.prompt('Enter Delete Secret Code:');
    if (secret !== process.env.NEXT_PUBLIC_DELETE_SECRET_CODE) {
      window.alert('Incorrect Secret Code');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete ${comp.name} and its files?`)) {
      try {
        const paths = [
          extractPath(comp.component_image_url),
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

        window.alert('Component deleted successfully!');
        
        // Reset form if admin deletes the component they were currently editing
        if (editingComponentId === comp.id) {
          resetForm();
        }
        fetchComponents();
      } catch (err: unknown) {
        if (err instanceof Error) {
          window.alert(`Error: ${err.message}`);
        } else {
          window.alert('An unknown error occurred.');
        }
      }
    }
  };

  const handleEditComponent = (comp: ComponentRecord) => {
    setName(comp.name);
    setDescription(comp.description || '');
    setTags(comp.tags || '');
    setEditingComponentId(comp.id);
    
    // Clear any previously selected new files so they don't overwrite if untouched during edit
    setComponentImage(null);
    setSymbolPreview(null);
    setFootprintPreview(null);
    setSymbolFile(null);
    setFootprintFile(null);
    setMessage('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTags('');
    setComponentImage(null);
    setSymbolPreview(null);
    setFootprintPreview(null);
    setSymbolFile(null);
    setFootprintFile(null);
    setEditingComponentId(null);
    setMessage('');
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

      const payload: Partial<ComponentRecord> = {
        name,
        description,
        tags
      };

      if (componentImage) payload.component_image_url = await uploadFile(componentImage);
      if (symbolPreview) payload.symbol_preview_url = await uploadFile(symbolPreview);
      if (footprintPreview) payload.footprint_preview_url = await uploadFile(footprintPreview);
      if (symbolFile) payload.symbol_file_url = await uploadFile(symbolFile);
      if (footprintFile) payload.footprint_file_url = await uploadFile(footprintFile);

      if (editingComponentId) {
        const { error } = await supabase.from('components').update(payload).eq('id', editingComponentId);
        if (error) throw error;
        setMessage('Component updated successfully! 🎉');
      } else {
        const { error } = await supabase.from('components').insert([payload]);
        if (error) throw error;
        setMessage('Component created successfully! 🎉');
      }

      resetForm();
      fetchComponents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(`Error: ${err.message}`);
      } else {
        setMessage('An unknown error occurred.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500 relative z-10">
      {cropTarget && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          aspectRatio={1}
          onApply={handleCropApply}
          onCancel={() => {
            setCropTarget(null);
            setCropImageSrc('');
          }}
        />
      )}

      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-3 text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 font-medium text-lg">Securely upload, edit, or delete PCB components.</p>
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

        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* COMPONENT REAL PHOTO */}
          <div className="col-span-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Component Real Photo (1:1)</label>
            <div className="relative flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden h-48 group hover:border-blue-400 transition-colors cursor-pointer">
              {componentImage ? (
                <img src={URL.createObjectURL(componentImage)} className="w-full h-full object-cover" alt="Component" />
              ) : (
                <span className="text-slate-400 font-medium text-sm group-hover:text-blue-500 text-center px-4">
                  {editingComponentId ? 'Select new to overwrite' : 'Click to Select'}
                </span>
              )}
              <input type="file" accept="image/*" onChange={e => handleFileSelectForCrop(e, 'componentImage')} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* SYMBOL PREVIEW */}
          <div className="col-span-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Symbol Preview (1:1)</label>
            <div className="relative flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden h-48 group hover:border-blue-400 transition-colors cursor-pointer">
              {symbolPreview ? (
                <img src={URL.createObjectURL(symbolPreview)} className="w-full h-full object-cover" alt="Symbol" />
              ) : (
                <span className="text-slate-400 font-medium text-sm group-hover:text-blue-500 text-center px-4">
                  {editingComponentId ? 'Select new to overwrite' : 'Click to Select'}
                </span>
              )}
              <input type="file" accept="image/*" onChange={e => handleFileSelectForCrop(e, 'symbolPreview')} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* FOOTPRINT PREVIEW */}
          <div className="col-span-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Footprint Preview (1:1)</label>
            <div className="relative flex-1 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden h-48 group hover:border-blue-400 transition-colors cursor-pointer">
              {footprintPreview ? (
                <img src={URL.createObjectURL(footprintPreview)} className="w-full h-full object-cover" alt="Footprint" />
              ) : (
                <span className="text-slate-400 font-medium text-sm group-hover:text-blue-500 text-center px-4">
                  {editingComponentId ? 'Select new to overwrite' : 'Click to Select'}
                </span>
              )}
              <input type="file" accept="image/*" onChange={e => handleFileSelectForCrop(e, 'footprintPreview')} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* FILES SECTION */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Schematic Symbol (.lib)</label>
            <div className="relative">
              <input type="file" onChange={e => setSymbolFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer transition-colors" />
              {editingComponentId && !symbolFile && <div className="text-xs text-slate-400 mt-2 ml-2">Leave blank to keep existing file</div>}
            </div>
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">PCB Footprint (.kicad_mod)</label>
            <div className="relative">
              <input type="file" onChange={e => setFootprintFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer transition-colors" />
              {editingComponentId && !footprintFile && <div className="text-xs text-slate-400 mt-2 ml-2">Leave blank to keep existing file</div>}
            </div>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Admin Secret Key (Required for {editingComponentId ? 'Update' : 'Upload'})</label>
          <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Enter admin password to verify action" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <button type="submit" disabled={loading} className="flex-1 py-5 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg tracking-wide rounded-xl shadow-xl shadow-slate-900/20 transition-all disabled:opacity-50 active:scale-95">
            {loading ? 'Processing...' : (editingComponentId ? 'Update Component' : 'Deploy Component')}
          </button>
          {editingComponentId && (
            <button type="button" onClick={resetForm} disabled={loading} className="py-5 px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg tracking-wide rounded-xl transition-all disabled:opacity-50 active:scale-95 border border-slate-200">
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* DELETE SECTION */}
      <div className="mt-16">
        <h2 className="text-3xl font-black mb-6 text-slate-900 tracking-tight">Manage Components</h2>
        <div className="space-y-4">
          {components.length > 0 ? components.map(comp => (
            <div key={comp.id} className={`flex justify-between items-center p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all ${editingComponentId === comp.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
              <div className="pr-4">
                <h3 className="text-xl font-bold text-slate-800">{comp.name} {editingComponentId === comp.id && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full uppercase tracking-widest font-bold">Editing</span>}</h3>
                <p className="text-slate-500 text-sm mt-1">{comp.description?.substring(0, 60)}...</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button 
                  onClick={() => handleEditComponent(comp)}
                  className="px-5 py-2.5 bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteComponent(comp)}
                  className="px-5 py-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold rounded-xl transition-colors border border-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          )) : (
            <p className="text-slate-500 font-medium text-center py-8">No components found.</p>
          )}
        </div>
      </div>
    </div>
  );
}