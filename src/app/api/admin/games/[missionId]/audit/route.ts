import { getAdminGameAuditRoute } from '@/features/games/adapters/next/adminGameMissionRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const GET = withApiGuards(getAdminGameAuditRoute, {
	name: 'api.admin.games.audit.get',
	logSteamId: true
});
