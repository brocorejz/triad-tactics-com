import { postAdminGameReleaseRegularRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameReleaseRegularRoute, {
	name: 'api.admin.games.release-regular.post',
	logSteamId: true
});
