import { useEffect } from 'react';

interface ImagePreviewModalProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

export const ImagePreviewModal = ({ images, startIndex, onClose }: ImagePreviewModalProps) => {
  const current = Math.min(Math.max(startIndex, 0), images.length - 1);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative max-w-3xl w-full px-4" onClick={(e) => e.stopPropagation()}>
        <img src={images[current]} alt="preview" className="max-h-[80vh] w-full object-contain rounded" />
        <button className="absolute top-3 right-3 bg-white/90 text-gray-900 px-3 py-1 rounded shadow" onClick={onClose}>关闭</button>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={`border ${i === current ? 'border-blue-600' : 'border-transparent'} rounded`}>
                <img src={url} alt="thumb" className="w-20 h-16 object-cover rounded" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};