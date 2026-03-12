import type { GameAuditEvent } from '../domain/types';
import type { GetMissionAuditDeps } from '../ports';

export type GetMissionAuditHistoryResult =
	| { ok: true; events: GameAuditEvent[] }
	| {
			ok: false;
			error: 'not_found' | 'database_error';
	  };

export function getMissionAuditHistory(
	deps: GetMissionAuditDeps,
	input: { missionId: number }
): GetMissionAuditHistoryResult {
	const result = deps.repo.getMissionAuditHistory(input);
	if (result.success) {
		return { ok: true, events: result.events };
	}
	return { ok: false, error: result.error };
}
