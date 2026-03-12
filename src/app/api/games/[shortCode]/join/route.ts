import { postGameJoinRoute } from '@/features/games/adapters/next/gameParticipationRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postGameJoinRoute, {
	name: 'api.games.join.post',
	logSteamId: true
});
