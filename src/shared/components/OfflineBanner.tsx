import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-gold text-white px-4 py-2 text-sm font-medium animate-slide-up"
      role="alert"
      data-testid="offline-banner"
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>{t('home.offline')}</span>
    </div>
  );
};
