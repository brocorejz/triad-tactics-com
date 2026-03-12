import { NextRequest, NextResponse } from 'next/server';
import { getCurrentGame } from '@/features/games/useCases/getCurrentGame';
import { getCurrentGameDeps } from '@/features/games/deps';
import { errorToLogObject, logger } from '@/platform/logger';

export async function getCurrentGameRoute(_request: NextRequest): Promise<NextResponse> {
	try {
		const current = getCurrentGame(getCurrentGameDeps);
		return NextResponse.json({ success: true, current });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'current_game_load_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}
