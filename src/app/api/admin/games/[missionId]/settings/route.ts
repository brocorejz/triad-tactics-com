import { putAdminGameSettingsRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const PUT = withApiGuards(putAdminGameSettingsRoute, {
	name: 'api.admin.games.settings.put',
	logSteamId: true
});
