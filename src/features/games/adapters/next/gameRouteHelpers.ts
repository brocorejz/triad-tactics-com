import { NextRequest, NextResponse } from 'next/server';
import { STEAM_SESSION_COOKIE } from '@/features/steamAuth/sessionCookie';
import { steamAuthDeps } from '@/features/steamAuth/deps';
import { isConfirmedByAccessLevel } from '@/features/users/domain/api';
import { getUserStatus } from '@/features/users/useCases/getUserStatus';

export type GameRouteContext = {
	params: Promise<{ shortCode: string }>;
};

export function requireConfirmedGameUser(request: NextRequest) {
	const sid = request.cookies.get(STEAM_SESSION_COOKIE)?.value ?? null;
	const status = getUserStatus(steamAuthDeps, sid);
	if (!status.connected) {
		return { ok: false as const, response: NextResponse.json({ error: 'steam_required' }, { status: 401 }) };
	}
	if (!isConfirmedByAccessLevel(status.accessLevel)) {
		return { ok: false as const, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
	}
	return { ok: true as const, steamId64: status.steamid64 };
}

export async function readShortCode(context: GameRouteContext): Promise<string | null> {
	const { shortCode } = await context.params;
	const trimmed = shortCode.trim();
	return trimmed || null;
}
