import { postAdminGameCancelRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameCancelRoute, {
	name: 'api.admin.games.cancel.post',
	logSteamId: true
});
