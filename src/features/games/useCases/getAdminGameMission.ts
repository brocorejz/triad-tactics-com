import type { GameAdminMission } from '../domain/types';
import type { GetAdminGameMissionDeps } from '../ports';

export type GetAdminGameMissionResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error: 'not_found' | 'database_error';
	  };

export function getAdminGameMission(
	deps: GetAdminGameMissionDeps,
	input: { missionId: number }
): GetAdminGameMissionResult {
	const result = deps.repo.getMissionById(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
