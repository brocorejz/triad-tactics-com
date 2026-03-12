import { postGameLeaveSlotRoute } from '@/features/games/adapters/next/gameParticipationRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postGameLeaveSlotRoute, {
	name: 'api.games.leave-slot.post',
	logSteamId: true
});
