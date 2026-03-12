import { NextRequest, NextResponse } from 'next/server';
import { getGameArchiveSummariesDeps } from '@/features/games/deps';
import { getGameArchiveSummaries } from '@/features/games/useCases/getGameArchiveSummaries';
import { errorToLogObject, logger } from '@/platform/logger';
import { requireConfirmedGameUser } from './gameRouteHelpers';

export async function getGameArchiveRoute(request: NextRequest): Promise<NextResponse> {
	try {
		const member = requireConfirmedGameUser(request);
		if (!member.ok) return member.response;

		const archive = getGameArchiveSummaries(getGameArchiveSummariesDeps);
		if (!archive.ok) {
			return NextResponse.json({ error: 'database_error' }, { status: 500 });
		}

		return NextResponse.json({ success: true, archive: archive.archive });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'game_archive_load_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}
