import type { GameAdminMission } from '../domain/types';
import type { ArchiveGameDeps } from '../ports';
import type { ArchiveGameRequest } from '../domain/requests';

export type ArchiveGameResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error: 'not_found' | 'not_published' | 'already_archived' | 'archive_result_invalid' | 'database_error';
	  };

export function archiveGame(
	deps: ArchiveGameDeps,
	input: ArchiveGameRequest & { missionId: number; archivedBySteamId64: string }
): ArchiveGameResult {
	const result = deps.repo.archiveGame(input);
	if (result.success) {
		return { ok: true, mission: result.mission };
	}
	return { ok: false, error: result.error };
}
