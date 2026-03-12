import { postAdminGameArchiveRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameArchiveRoute, {
	name: 'api.admin.games.archive.post',
	logSteamId: true
});
