import { postGameLeaveRoute } from '@/features/games/adapters/next/gameParticipationRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postGameLeaveRoute, {
	name: 'api.games.leave.post',
	logSteamId: true
});
