import { postAdminGamePublishRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGamePublishRoute, {
	name: 'api.admin.games.publish.post',
	logSteamId: true
});
