import type { GameAdminMission } from '../domain/types';
import type { ReleaseRegularGameplayDeps } from '../ports';

export type ReleaseRegularGameplayResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error:
				| 'not_found'
				| 'not_published'
				| 'priority_release_required'
				| 'final_password_required'
				| 'already_released'
				| 'database_error';
	  };

export function releaseRegularGameplay(
	deps: ReleaseRegularGameplayDeps,
	input: { missionId: number; releasedBySteamId64: string }
): ReleaseRegularGameplayResult {
	const result = deps.repo.releaseRegularGameplay(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
