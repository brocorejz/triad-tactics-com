import type { LeaveRegularGameDeps } from '../ports';

export type LeaveRegularGameResult =
	| { ok: true; left: boolean }
	| {
			ok: false;
			error: 'mission_not_found' | 'database_error';
	  };

export function leaveRegularGame(
	deps: LeaveRegularGameDeps,
	input: { shortCode: string; steamId64: string }
): LeaveRegularGameResult {
	const result = deps.repo.leaveRegularGame(input);
	if (result.success) return { ok: true, left: result.left };
	return { ok: false, error: result.error };
}
