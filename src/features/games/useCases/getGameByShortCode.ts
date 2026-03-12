import type { GameMissionDetail } from '../domain/types';
import type { GetGameByShortCodeDeps } from '../ports';

export type GetGameByShortCodeResult =
	| { ok: true; mission: GameMissionDetail }
	| {
			ok: false;
			error: 'not_found' | 'database_error';
	  };

export function getGameByShortCode(
	deps: GetGameByShortCodeDeps,
	input: { shortCode: string; steamId64: string }
): GetGameByShortCodeResult {
	const result = deps.repo.getGameByShortCode(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
