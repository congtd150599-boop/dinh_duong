import type { ChildRecord } from '@dinhduong/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getChildHistory, searchChildren } from '../api/children';

const DEBOUNCE_MS = 300;

/** Debounced typeahead for InputTab's "existing child" picker. Returns [] for a query shorter than 2 chars (mirrors the backend's own minimum). */
export function useSearchChildren(query: string): { results: ChildRecord[]; isLoading: boolean } {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = debounced.trim();
  const { data, isFetching } = useQuery({
    queryKey: ['children', 'search', trimmed],
    queryFn: () => searchChildren(trimmed),
    enabled: trimmed.length >= 2,
  });

  return { results: trimmed.length >= 2 ? (data ?? []) : [], isLoading: isFetching };
}

export function useChildHistory(childId: string | null) {
  return useQuery({
    queryKey: ['children', 'history', childId],
    queryFn: () => getChildHistory(childId as string),
    enabled: !!childId,
  });
}
