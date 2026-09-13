import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ open, title, onClose, children, size = 'md' }: Props) {
  if (!open) return null;

  const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 grid place-items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`card w-full ${maxW} max-h-[92vh] overflow-auto fade-in`}
        style={{ padding: '24px' }}
      >
        <div className="flex justify-between items-center mb-6">
          {title && <h2 className="font-bold text-lg">{title}</h2>}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
