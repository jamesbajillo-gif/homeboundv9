import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVICI } from '@/contexts/VICIContext';
import { getUserId } from '@/lib/userHistory';
import { toast } from 'sonner';

interface ProtectedSettingsRouteProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that protects settings routes - only allows user "000"
 */
export const ProtectedSettingsRoute = ({ children }: ProtectedSettingsRouteProps) => {
  const navigate = useNavigate();
  const { leadData } = useVICI();

  useEffect(() => {
    const userId = getUserId(leadData);
    if (userId !== '000') {
      toast.error('Access denied. Settings are only available for user 000.');
      navigate('/');
    }
  }, [leadData, navigate]);

  const userId = getUserId(leadData);
  if (userId !== '000') {
    return null; // Don't render anything if not authorized
  }

  return <>{children}</>;
};

