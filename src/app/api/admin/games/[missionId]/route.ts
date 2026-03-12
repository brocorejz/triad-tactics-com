import {
	deleteAdminArchivedMissionRoute,
	getAdminGameMissionRoute
} from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const GET = withApiGuards(getAdminGameMissionRoute, {
	name: 'api.admin.games.detail.get',
	logSteamId: true
});

export const DELETE = withApiGuards(deleteAdminArchivedMissionRoute, {
	name: 'api.admin.games.detail.delete',
	logSteamId: true
});
