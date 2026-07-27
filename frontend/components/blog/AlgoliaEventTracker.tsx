'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getAlgoliaUserToken, sendAlgoliaEvent } from '@/lib/algolia';

interface AlgoliaEventTrackerProps {
  objectID: string;
  indexName?: string;
}

export default function AlgoliaEventTracker({ objectID, indexName }: AlgoliaEventTrackerProps) {
  const { data: session } = useSession();

  useEffect(() => {
    sendAlgoliaEvent({
      eventType: 'view',
      eventName: 'Content Viewed',
      index: indexName ?? 'articles',
      objectIDs: [objectID],
      userToken: getAlgoliaUserToken(session?.user?.id),
    });
  }, [objectID, indexName, session?.user?.id]);

  return null;
}
