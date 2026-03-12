import type { UpdateGameSettingsRequest } from '../domain/requests';
import type { GameAdminMission } from '../domain/types';
import type { UpdateGameSettingsDeps } from '../ports';

export type UpdateGameSettingsResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error:
				| 'not_found'
				| 'settings_revision_conflict'
				| 'short_code_locked'
				| 'short_code_taken'
				| 'regular_join_requires_regular_slots'
				| 'badge_not_found'
				| 'database_error';
	  };

export function updateGameSettings(
	deps: UpdateGameSettingsDeps,
	input: UpdateGameSettingsRequest & { missionId: number; updatedBySteamId64: string }
): UpdateGameSettingsResult {
	const result = deps.repo.updateSettings(input);
	if (result.success) return { ok: true, mission: result.mission };
	return { ok: false, error: result.error };
}
