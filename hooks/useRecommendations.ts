'use client';

import { useState, useEffect } from 'react';
import type { CommonAmountsResponse, SourceToken } from '@/app/_components/types';

export function useRecommendations(selectedToken: SourceToken) {
  const [recommendations, setRecommendations] = useState<CommonAmountsResponse | null>(null);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await fetch(`/api/cipherscan/api/privacy/common-amounts?chain=${selectedToken.chain}&period=30d&limit=10`);
        const data = await res.json();
        if (data.success && data.amounts?.length > 0) setRecommendations(data);
        else setRecommendations(null);
      } catch {
        setRecommendations(null);
      }
    };
    fetchRecs();
  }, [selectedToken]);

  return recommendations;
}
