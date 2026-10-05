'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ComponentDetail() {
  const params = useParams();
  const [component, setComponent] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    fetchComponent();
  }, [params.id]);

  const fetchComponent = async () => {
    try {
      const { data: compData, error: compErr } = await supabase.from('components').select('*').eq('id', params.id).single();
      if (compErr) throw compErr;
      
      const { data: commentsData } = await supabase.from('comments').select('*').eq('component_id', params.id).order('created_at', { ascending: false });
      
      setComponent({ ...compData, comments: commentsData || [] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (url: string | null) => {
    if (url) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const urlParts = url.split('/');
        const rawFileName = urlParts[urlParts.length - 1].split('?')[0];
        const decodedFileName = decodeURIComponent(rawFileName);
        const cleanFileName = decodedFileName.replace(/^\d+_/, '');
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = cleanFileName;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        
        setShowFeedbackModal(true);
      } catch (err) {
        console.error("Download failed:", err);
        alert('Failed to securely download the file. Please try again.');
      }
    } else {
      alert('This file is currently unavailable for download.');
    }
  };



  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !content) return;
    
    try {
      const { error } = await supabase.from('comments').insert([{
        component_id: params.id,
        user_name: userName,
        content,
        rating
      }]);
      
      if (error) throw error;
      
      setContent('');
      setShowFeedbackModal(false);
      fetchComponent();
    } catch (err) {
      console.error(err);
    }
  };

  if (!component) return <div className="text-center py-24 text-slate-400 animate-pulse font-semibold">Loading component data...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row gap-10 shadow-xl shadow-slate-200/40">
        <div className="w-full md:w-1/2 h-72 md:h-auto bg-slate-50 rounded-3xl overflow-hidden relative border border-slate-100 flex items-center justify-center p-4">
          {component.preview_image_url ? (
            <img src={component.preview_image_url} alt={component.name} className="w-full h-full object-contain mix-blend-multiply" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">No Preview Available</div>
          )}
        </div>
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{component.name}</h1>
          <p className="text-slate-600 mb-8 text-lg leading-relaxed">{component.description}</p>
          <div className="mb-10 flex flex-wrap gap-2">
            {component.tags?.split(',').map((tag: string, i: number) => (
               <span key={i} className="px-4 py-1.5 bg-blue-50 border border-blue-100 text-sm rounded-full text-blue-600 font-bold tracking-wide">{tag.trim()}</span>
            ))}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => handleDownload(component.symbol_file_url)}
              className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Symbol (.lib)
            </button>
            <button 
              onClick={() => handleDownload(component.footprint_file_url)}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Footprint (.kicad)
            </button>
          </div>
        </div>
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-8 md:p-10 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black mb-2 text-slate-900 tracking-tight">Download Started! 🎉</h2>
            <p className="text-slate-500 mb-6 font-medium">How was your experience? Leave a quick rating for the community.</p>
            <form onSubmit={submitComment} className="space-y-4">
              <input type="text" placeholder="Your Name" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none font-medium" required />
              <textarea placeholder="Any feedback? Works great?" value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none font-medium" rows={3} required></textarea>
              <div className="flex gap-2 justify-center py-2">
                {[1,2,3,4,5].map(num => (
                  <button type="button" key={num} onClick={() => setRating(num)} className={`text-4xl p-1 rounded-full transition-colors transform hover:scale-110 ${rating >= num ? 'text-yellow-400' : 'text-slate-200 hover:text-slate-300'}`}>
                    ★
                  </button>
                ))}
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Skip for now</button>
                <button type="submit" className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 transition-all">Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-20">
        <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-900 tracking-tight">
          <span className="p-2 bg-blue-100 rounded-xl text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
          </span>
          Community Experience
        </h3>
        
        <div className="space-y-6">
          {component.comments?.length > 0 ? (
            component.comments.map((comment: any) => (
              <div key={comment.id} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-bold text-slate-800 text-lg">{comment.user_name}</span>
                  <span className="text-yellow-400 text-sm tracking-widest">{'★'.repeat(comment.rating || 5)}<span className="text-slate-200">{'★'.repeat(5 - (comment.rating || 5))}</span></span>
                </div>
                <p className="text-slate-600 leading-relaxed">{comment.content}</p>
                <div className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{new Date(comment.created_at).toLocaleDateString()}</div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 font-medium p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center">No feedback yet. Be the first to try it out!</p>
          )}
        </div>
        
        <form onSubmit={submitComment} className="mt-10 bg-white border border-slate-200 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50">
          <h4 className="text-xl font-black mb-6 text-slate-900 tracking-tight">Leave a Comment</h4>
          <div className="space-y-5">
            <input type="text" placeholder="Your Name" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" required />
            <textarea placeholder="What do you think about this component?" value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" rows={4} required></textarea>
            <button type="submit" className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-95">Post Comment</button>
          </div>
        </form>
      </div>
    </div>
  );
}