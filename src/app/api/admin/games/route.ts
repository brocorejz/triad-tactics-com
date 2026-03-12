import { getAdminGamesRoute } from '@/features/games/adapters/next/adminGamesRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const GET = withApiGuards(getAdminGamesRoute, { name: 'api.admin.games.overview', logSteamId: true });
