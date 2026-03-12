import type { DeleteArchivedMissionDeps } from '../ports';

export type DeleteArchivedMissionResult =
	| { ok: true }
	| {
			ok: false;
			error: 'not_found' | 'not_archived' | 'title_confirmation_mismatch' | 'database_error';
	  };

export function deleteArchivedMission(
	deps: DeleteArchivedMissionDeps,
	input: { missionId: number; titleConfirmation: string }
): DeleteArchivedMissionResult {
	const result = deps.repo.deleteArchivedMission(input);
	if (result.success) {
		return { ok: true };
	}
	return { ok: false, error: result.error };
}
