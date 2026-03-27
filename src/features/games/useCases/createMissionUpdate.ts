import type { CreateMissionUpdateRequest } from '../domain/requests';
import type { GameAdminMission } from '../domain/types';
import type { CreateMissionUpdateDeps } from '../ports';

export type CreateMissionUpdateResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error: 'not_found' | 'not_published' | 'database_error';
	  };

export function createMissionUpdate(
	deps: CreateMissionUpdateDeps,
	input: CreateMissionUpdateRequest & { missionId: number; createdBySteamId64: string }
): CreateMissionUpdateResult {
	const result = deps.repo.createMissionUpdate(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}

	return { ok: false, error: result.error };
}
