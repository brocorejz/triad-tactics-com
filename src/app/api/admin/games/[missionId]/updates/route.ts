import { postAdminGameMissionUpdateRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameMissionUpdateRoute, {
	name: 'api.admin.games.updates.post',
	logSteamId: true
});
