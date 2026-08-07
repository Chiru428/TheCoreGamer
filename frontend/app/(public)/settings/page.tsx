'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SettingsIndex() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // On desktop, immediately redirect to profile since the sidebar is always visible
    if (window.innerWidth >= 768) {
      router.replace('/settings/profile');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="hidden md:flex items-center justify-center h-full min-h-[400px] text-text-muted">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Redirecting...
    </div>
  );
}
