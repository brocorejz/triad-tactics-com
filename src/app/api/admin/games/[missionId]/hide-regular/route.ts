import { postAdminGameHideRegularRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameHideRegularRoute, {
	name: 'api.admin.games.hide-regular.post',
	logSteamId: true
});
