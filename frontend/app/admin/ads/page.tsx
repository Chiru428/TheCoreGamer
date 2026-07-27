'use client';

import useSWR from 'swr';
import { fetchAdPlacements, updateAdPlacement } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Badge from '@/components/ui/Badge';
import { AD_ZONES } from '@/lib/constants';

export default function AdminAdsPage() {
  const { addToast } = useUIStore();
  const { data, mutate } = useSWR('admin-ads', () => fetchAdPlacements().then(r => r.data || []));

  const handleToggle = async (zoneId: string, isActive: boolean) => {
    const res = await updateAdPlacement(zoneId, { isActive: !isActive });
    if (res.success) { addToast({ type: 'success', message: `Zone ${!isActive ? 'enabled' : 'disabled'}` }); mutate(); }
    else addToast({ type: 'error', message: res.error || 'Failed' });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Ad Zones</h1>
      <div className="space-y-3">
        {Object.entries(AD_ZONES).map(([id, zone]) => {
          const placement = (data || []).find(p => p.zoneId === id);
          return (
            <div key={id} className="flex items-center justify-between p-4 rounded-xl bg-bg-surface border border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-text-primary">{zone.name}</p>
                  <Badge size="sm">{id}</Badge>
                </div>
                <p className="text-xs text-text-muted">{zone.width}×{zone.height} — {zone.format}</p>
              </div>
              <button onClick={() => handleToggle(id, placement?.isActive ?? false)}
                className={`w-10 h-6 rounded-full transition-colors ${placement?.isActive ? 'bg-accent-green' : 'bg-border'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${placement?.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
