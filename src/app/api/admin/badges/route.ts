import { getAdminBadgesRoute, postAdminBadgesRoute } from '@/features/admin/adapters/next/badgesRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const GET = withApiGuards(getAdminBadgesRoute, { name: 'api.admin.badges.list', logSteamId: true });
export const POST = withApiGuards(postAdminBadgesRoute, { name: 'api.admin.badges.create', logSteamId: true });
