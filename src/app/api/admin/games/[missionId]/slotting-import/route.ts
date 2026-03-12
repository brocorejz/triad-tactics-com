import { postAdminGameSlottingImportRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameSlottingImportRoute, {
	name: 'api.admin.games.slotting-import.post',
	logSteamId: true
});
