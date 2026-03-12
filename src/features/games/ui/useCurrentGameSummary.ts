'use client';

import { useEffect, useState } from 'react';
import type { CurrentGameSummary } from '@/features/games/domain/types';

type CurrentGameResponse = {
	success?: boolean;
	current?: CurrentGameSummary | null;
};

export function useCurrentGameSummary(enabled: boolean): CurrentGameSummary | null {
	const [current, setCurrent] = useState<CurrentGameSummary | null>(null);

	useEffect(() => {
		if (!enabled) return;

		let cancelled = false;

		(async () => {
			try {
				const res = await fetch('/api/games/current', {
					cache: 'no-store',
					headers: { Accept: 'application/json' }
				});
				if (!res.ok) {
					if (!cancelled) setCurrent(null);
					return;
				}

				const json = (await res.json()) as CurrentGameResponse;
				if (!cancelled) {
					setCurrent(json.success === true ? json.current ?? null : null);
				}
			} catch {
				if (!cancelled) setCurrent(null);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [enabled]);

	return enabled ? current : null;
}
