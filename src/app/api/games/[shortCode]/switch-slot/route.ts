import { postGameSwitchSlotRoute } from '@/features/games/adapters/next/gameParticipationRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postGameSwitchSlotRoute, {
	name: 'api.games.switch-slot.post',
	logSteamId: true
});
