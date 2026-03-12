import type { JoinRegularGameDeps } from '../ports';

export type JoinRegularGameResult =
	| { ok: true; joined: boolean }
	| {
			ok: false;
			error:
				| 'mission_not_found'
				| 'join_closed'
				| 'already_has_slot'
				| 'priority_slot_available'
				| 'database_error';
	  };

export function joinRegularGame(
	deps: JoinRegularGameDeps,
	input: { shortCode: string; steamId64: string }
): JoinRegularGameResult {
	const result = deps.repo.joinRegularGame(input);
	if (result.success) return { ok: true, joined: result.joined };
	return { ok: false, error: result.error };
}
