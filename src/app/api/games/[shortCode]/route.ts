import { getGameMissionRoute } from '@/features/games/adapters/next/gameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const GET = withApiGuards(getGameMissionRoute, {
	name: 'api.games.detail',
	logSteamId: true
});
