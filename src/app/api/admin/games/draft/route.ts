import {
	deleteAdminGameDraftRoute,
	postAdminGameDraftRoute
} from '@/features/games/adapters/next/adminGameDraftRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminGameDraftRoute, {
	name: 'api.admin.games.draft.create',
	logSteamId: true
});
export const DELETE = withApiGuards(deleteAdminGameDraftRoute, {
	name: 'api.admin.games.draft.delete',
	logSteamId: true
});
