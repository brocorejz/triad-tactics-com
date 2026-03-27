import type { CreateMissionUpdateRequest } from '../domain/requests';
import type { GameAdminMission } from '../domain/types';
import type { UpdateMissionUpdateDeps } from '../ports';

export type UpdateMissionUpdateResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error: 'not_found' | 'not_published' | 'database_error';
	  };

export function updateMissionUpdate(
	deps: UpdateMissionUpdateDeps,
	input: CreateMissionUpdateRequest & { missionId: number; updateId: number; updatedBySteamId64: string }
): UpdateMissionUpdateResult {
	const result = deps.repo.updateMissionUpdate(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}

	return { ok: false, error: result.error };
}
