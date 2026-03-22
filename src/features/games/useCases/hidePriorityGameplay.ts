import type { GameAdminMission } from '../domain/types';
import type { HidePriorityGameplayDeps } from '../ports';

export type HidePriorityGameplayResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error:
				| 'not_found'
				| 'not_published'
				| 'regular_release_hide_required'
				| 'already_hidden'
				| 'database_error';
	  };

export function hidePriorityGameplay(
	deps: HidePriorityGameplayDeps,
	input: { missionId: number; hiddenBySteamId64: string }
): HidePriorityGameplayResult {
	const result = deps.repo.hidePriorityGameplay(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
