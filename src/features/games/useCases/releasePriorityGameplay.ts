import type { GameAdminMission } from '../domain/types';
import type { ReleasePriorityGameplayDeps } from '../ports';

export type ReleasePriorityGameplayResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error: 'not_found' | 'not_published' | 'final_password_required' | 'already_released' | 'database_error';
	  };

export function releasePriorityGameplay(
	deps: ReleasePriorityGameplayDeps,
	input: { missionId: number; releasedBySteamId64: string }
): ReleasePriorityGameplayResult {
	const result = deps.repo.releasePriorityGameplay(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
