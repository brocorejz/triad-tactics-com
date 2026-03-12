import { postAdminGameReleasePriorityRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameReleasePriorityRoute, {
	name: 'api.admin.games.release-priority.post',
	logSteamId: true
});
