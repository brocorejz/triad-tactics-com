import type { GameAdminMission } from '../domain/types';
import type { HideRegularGameplayDeps } from '../ports';

export type HideRegularGameplayResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error: 'not_found' | 'not_published' | 'already_hidden' | 'database_error';
	  };

export function hideRegularGameplay(
	deps: HideRegularGameplayDeps,
	input: { missionId: number; hiddenBySteamId64: string }
): HideRegularGameplayResult {
	const result = deps.repo.hideRegularGameplay(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
