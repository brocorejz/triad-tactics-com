import { postAdminGameHidePriorityRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameHidePriorityRoute, {
	name: 'api.admin.games.hide-priority.post',
	logSteamId: true
});
