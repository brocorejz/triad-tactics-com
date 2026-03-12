import type { ImportGameSlottingRequest } from '../domain/requests';
import type { GameAdminMission, GameSlottingDestructiveChange } from '../domain/types';
import type { ImportGameSlottingDeps } from '../ports';

export type ImportGameSlottingResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error:
				| 'not_found'
				| 'legacy_slotting_invalid'
				| 'slotting_revision_conflict'
				| 'regular_join_requires_regular_slots'
				| 'destructive_change_requires_confirmation'
				| 'database_error';
			destructiveChanges?: GameSlottingDestructiveChange[];
	  };

export function importGameSlotting(
	deps: ImportGameSlottingDeps,
	input: ImportGameSlottingRequest & { missionId: number; updatedBySteamId64: string }
): ImportGameSlottingResult {
	const result = deps.repo.importSlotting(input);
	if (result.success) return { ok: true, mission: result.mission };
	return { ok: false, error: result.error, destructiveChanges: result.destructiveChanges };
}
