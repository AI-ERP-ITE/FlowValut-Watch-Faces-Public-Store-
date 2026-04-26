import { useNavigate } from 'react-router-dom';
import { IconLab } from '@/components/IconLab';

export default function LabPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <IconLab
        open
        onClose={() => navigate('/studio')}
      />
    </div>
  );
}
