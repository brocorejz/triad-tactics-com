import { postGameClaimRoute } from '@/features/games/adapters/next/gameParticipationRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postGameClaimRoute, {
	name: 'api.games.claim.post',
	logSteamId: true
});
