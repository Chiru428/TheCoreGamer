import { Gamepad2 } from 'lucide-react';
import { FaWindows, FaPlaystation, FaXbox, FaApple, FaLinux, FaAndroid } from 'react-icons/fa';

export const PLATFORM_BRAND_COLORS: Record<string, string> = {
  windows: '#00ADEF',
  playstation: '#0070D1',
  xbox: '#107C10',
  apple: '#A3AAAE',
  linux: '#FCC624',
  android: '#3DDC84',
};

export default function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes('pc') || p.includes('windows')) return <FaWindows color={PLATFORM_BRAND_COLORS.windows} />;
  if (p.includes('playstation') || p === 'ps4' || p === 'ps5') return <FaPlaystation color={PLATFORM_BRAND_COLORS.playstation} />;
  if (p.includes('xbox')) return <FaXbox color={PLATFORM_BRAND_COLORS.xbox} />;
  if (p.includes('mac') || p.includes('ios') || p.includes('ipad')) return <FaApple color={PLATFORM_BRAND_COLORS.apple} />;
  if (p.includes('linux')) return <FaLinux color={PLATFORM_BRAND_COLORS.linux} />;
  if (p.includes('android')) return <FaAndroid color={PLATFORM_BRAND_COLORS.android} />;
  return <Gamepad2 size={14} />;
}
