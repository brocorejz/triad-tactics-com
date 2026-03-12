import type { GameArchiveSummary } from '../domain/types';
import type { GetGameArchiveSummariesDeps } from '../ports';

export type GetGameArchiveSummariesResult =
	| { ok: true; archive: GameArchiveSummary[] }
	| {
			ok: false;
			error: 'database_error';
	  };

export function getGameArchiveSummaries(deps: GetGameArchiveSummariesDeps): GetGameArchiveSummariesResult {
	const result = deps.repo.getArchivedGameSummaries();
	if (result.success) {
		return { ok: true, archive: result.archive };
	}
	return { ok: false, error: result.error };
}
