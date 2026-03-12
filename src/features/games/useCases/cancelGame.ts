import type { GameAdminMission } from '../domain/types';
import type { CancelGameDeps } from '../ports';
import type { CancelGameRequest } from '../domain/requests';

export type CancelGameResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error: 'not_found' | 'not_published' | 'already_archived' | 'cancel_reason_required' | 'database_error';
	  };

export function cancelGame(
	deps: CancelGameDeps,
	input: CancelGameRequest & { missionId: number; archivedBySteamId64: string }
): CancelGameResult {
	const result = deps.repo.cancelGame(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
