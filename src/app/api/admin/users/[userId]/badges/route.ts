import { deleteAdminUserBadgeRoute, postAdminUserBadgeRoute } from '@/features/admin/adapters/next/badgesRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const POST = withApiGuards(postAdminUserBadgeRoute, {
	name: 'api.admin.users.badges.assign',
	logSteamId: true
});

export const DELETE = withApiGuards(deleteAdminUserBadgeRoute, {
	name: 'api.admin.users.badges.remove',
	logSteamId: true
});
