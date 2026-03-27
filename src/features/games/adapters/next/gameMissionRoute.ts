import { NextRequest, NextResponse } from 'next/server';
import { getGameByShortCodeDeps } from '@/features/games/deps';
import { getGameByShortCode } from '@/features/games/useCases/getGameByShortCode';
import { errorToLogObject, logger } from '@/platform/logger';
import { readShortCode, requireConnectedGameUser, type GameRouteContext } from './gameRouteHelpers';

export async function getGameMissionRoute(
	request: NextRequest,
	context: GameRouteContext
): Promise<NextResponse> {
	try {
		const member = requireConnectedGameUser(request);
		if (!member.ok) return member.response;

		const shortCode = await readShortCode(context);
		if (!shortCode) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const mission = getGameByShortCode(getGameByShortCodeDeps, {
			shortCode,
			steamId64: member.steamId64
		});

		if (!mission.ok) {
			if (mission.error === 'not_found') {
				return NextResponse.json({ error: 'mission_not_found' }, { status: 404 });
			}
			return NextResponse.json({ error: 'database_error' }, { status: 500 });
		}

		return NextResponse.json({ success: true, mission: mission.mission });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'game_mission_load_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}
