import { useNavigate } from 'react-router-dom';
import { IconLab } from '@/components/IconLab';

export default function LabPage() {
  const navigate = useNavigate();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white relative">
      <button
        type="button"
        onClick={() => navigate('/studio')}
        className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs uppercase tracking-widest text-zinc-300 hover:bg-zinc-800"
      >
        <img src={logoSrc} alt="Flowvault logo" className="h-7 w-auto" />
        Back to Studio
      </button>
      <IconLab
        open
        onClose={() => navigate('/studio')}
      />
    </div>
  );
}
