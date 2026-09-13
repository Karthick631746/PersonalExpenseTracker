import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** On mobile, use a full-screen sheet instead of bottom sheet */
  fullScreen?: boolean;
}

export default function Modal({ open, title, onClose, children, size = 'md', fullScreen }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <>
      {/* ── Mobile: bottom sheet ─────────────────────── */}
      <div className="md:hidden">
        <div
          className="sheet-overlay"
          onClick={onClose}
        />
        <div className={`sheet fade-in ${fullScreen ? 'sheet-full' : ''}`}>
          <div className="sheet-handle" />
          {title && (
            <div className="flex justify-between items-center px-5 py-4">
              <h2 className="font-bold text-base">{title}</h2>
              <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
                <X size={18} />
              </button>
            </div>
          )}
          {!title && (
            <div className="flex justify-end px-5 pt-2">
              <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
                <X size={18} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>

      {/* ── Desktop: centered modal ──────────────────── */}
      <div
        className="hidden md:grid fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 place-items-center"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className={`card w-full ${maxW} max-h-[92vh] overflow-auto fade-in`} style={{ padding: '28px' }}>
          <div className="flex justify-between items-center mb-6">
            {title && <h2 className="font-bold text-lg">{title}</h2>}
            <button onClick={onClose} className="btn btn-ghost btn-icon ml-auto" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
