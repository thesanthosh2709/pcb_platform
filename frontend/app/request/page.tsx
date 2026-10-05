'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequestComponentPage() {
  const [componentName, setComponentName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let fileUrl = null;

      // 1. Upload file if exists
      if (file) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('request_files')
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('request_files')
          .getPublicUrl(fileName);
        
        fileUrl = publicUrlData.publicUrl;
      }

      // 2. Insert into database
      const { error: dbError } = await supabase
        .from('component_requests')
        .insert([
          {
            component_name: componentName,
            description,
            file_url: fileUrl,
          },
        ]);

      if (dbError) throw dbError;

      // 3. Send Telegram Notification
      const telegramBotToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

      if (telegramBotToken && telegramChatId) {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: `🚀 *New Component Request!*\n\n📌 *Name:* ${componentName}\n📝 *Details:* ${description}\n📂 *File:* ${fileUrl ? fileUrl : 'No file attached'}`,
            parse_mode: 'Markdown'
          }),
        }).catch((err) => console.error("Telegram notification failed:", err));
      }

      setMessage('Request submitted successfully! We will process it soon.');
      setComponentName('');
      setDescription('');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setMessage(`Error submitting request: ${err.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500 relative z-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-3 text-slate-900">Request a Component</h1>
        <p className="text-slate-500 font-medium text-lg">Can't find what you need? Send us a request and we'll design it.</p>
      </div>

      {message && (
        <div className={`p-5 rounded-2xl mb-8 font-bold shadow-sm border ${message.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-8">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Component Name / Part Number</label>
          <input type="text" value={componentName} onChange={e => setComponentName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="e.g. ATmega328P-AU" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Details & Requirements</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" placeholder="Tell us about the specific package type, dimensions, or variations you need..."></textarea>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">Attach Datasheet / Image (Optional)</label>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-5 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer transition-colors" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-5 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg tracking-wide rounded-xl shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-95">
          {loading ? 'Submitting Request...' : 'Send Request'}
        </button>
      </form>
    </div>
  );
}
