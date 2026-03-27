import { putAdminGameMissionUpdateRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const PUT = withApiGuards(putAdminGameMissionUpdateRoute, {
	name: 'api.admin.games.updates.put',
	logSteamId: true
});
