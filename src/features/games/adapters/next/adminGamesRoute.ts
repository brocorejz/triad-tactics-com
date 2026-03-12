import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/features/admin/adapters/next/adminAuth';
import { getAdminGamesOverview } from '@/features/games/useCases/getAdminGamesOverview';
import { getAdminGamesOverviewDeps } from '@/features/games/deps';
import { errorToLogObject, logger } from '@/platform/logger';

export async function getAdminGamesRoute(request: NextRequest): Promise<NextResponse> {
	try {
		const admin = requireAdmin(request);
		if (!admin.ok) return admin.response;

		const overview = getAdminGamesOverview(getAdminGamesOverviewDeps);
		return NextResponse.json({ success: true, ...overview });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'admin_games_overview_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}
