import { postAdminBadgeStatusRoute } from '@/features/admin/adapters/next/badgesRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminBadgeStatusRoute, {
	name: 'api.admin.badges.status.post',
	logSteamId: true
});
