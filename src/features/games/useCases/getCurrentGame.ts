import type { CurrentGameSummary } from '../domain/types';
import type { GetCurrentGameDeps } from '../ports';

export function getCurrentGame(deps: GetCurrentGameDeps): CurrentGameSummary | null {
	return deps.repo.getCurrentPublishedSummary();
}
