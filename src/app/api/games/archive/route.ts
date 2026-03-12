import { getGameArchiveRoute } from '@/features/games/adapters/next/gameArchiveRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const GET = withApiGuards(getGameArchiveRoute, {
	name: 'api.games.archive',
	logSteamId: true
});
