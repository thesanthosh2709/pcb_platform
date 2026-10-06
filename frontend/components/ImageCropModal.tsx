import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

interface ImageCropModalProps {
  imageSrc: string;
  onApply: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropModal({
  imageSrc,
  onApply,
  onCancel,
  aspectRatio = 1,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, 'cropped-image.jpeg');
      if (croppedFile) {
        onApply(croppedFile);
      }
    } catch (e) {
      console.error(e);
      alert('Error cropping image');
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white relative z-10">
          <h3 className="text-xl font-bold text-slate-800">Crop Image</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="relative w-full h-[400px] bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-6 space-y-6 bg-white relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Zoom: {Math.round(zoom * 100)}%</label>
            <input 
              type="range" 
              value={zoom} 
              min={1} 
              max={3} 
              step={0.1} 
              onChange={(e) => setZoom(Number(e.target.value))} 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onCancel} 
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply} 
              disabled={isProcessing}
              className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
