import { getCurrentGameRoute } from '@/features/games/adapters/next/currentGameRoute';
import { withApiGuards } from '@/platform/apiGates';

export const runtime = 'nodejs';

export const GET = withApiGuards(getCurrentGameRoute, { name: 'api.games.current' });
