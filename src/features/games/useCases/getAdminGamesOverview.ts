import type { AdminGamesOverview } from '../domain/types';
import type { GetAdminGamesOverviewDeps } from '../ports';

export function getAdminGamesOverview(deps: GetAdminGamesOverviewDeps): AdminGamesOverview {
	return deps.repo.getAdminGamesOverview();
}
