import { NextRequest, NextResponse } from 'next/server';
import { claimPrioritySlotRequestSchema } from '@/features/games/domain/requests';
import {
	claimPrioritySlotDeps,
	joinRegularGameDeps,
	leavePrioritySlotDeps,
	leaveRegularGameDeps,
	switchPrioritySlotDeps
} from '@/features/games/deps';
import { readShortCode, requireConfirmedGameUser, type GameRouteContext } from './gameRouteHelpers';
import { claimPrioritySlot } from '@/features/games/useCases/claimPrioritySlot';
import { joinRegularGame } from '@/features/games/useCases/joinRegularGame';
import { leavePrioritySlot } from '@/features/games/useCases/leavePrioritySlot';
import { leaveRegularGame } from '@/features/games/useCases/leaveRegularGame';
import { switchPrioritySlot } from '@/features/games/useCases/switchPrioritySlot';
import { errorToLogObject, logger } from '@/platform/logger';

async function readRequestBody(request: NextRequest): Promise<unknown> {
	const raw = await request.text();
	if (!raw.trim()) return {};
	return JSON.parse(raw) as unknown;
}

export async function postGameClaimRoute(
	request: NextRequest,
	context: GameRouteContext
): Promise<NextResponse> {
	try {
		const member = requireConfirmedGameUser(request);
		if (!member.ok) return member.response;

		const shortCode = await readShortCode(context);
		if (!shortCode) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		let body: unknown;
		try {
			body = await readRequestBody(request);
		} catch {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const parsed = claimPrioritySlotRequestSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const claimed = claimPrioritySlot(claimPrioritySlotDeps, {
			shortCode,
			slotId: parsed.data.slotId,
			steamId64: member.steamId64
		});

		if (!claimed.ok) {
			if (claimed.error === 'mission_not_found' || claimed.error === 'slot_not_found') {
				return NextResponse.json({ error: claimed.error }, { status: 404 });
			}
			if (claimed.error === 'badge_required') {
				return NextResponse.json({ error: claimed.error }, { status: 403 });
			}
			const status = claimed.error === 'database_error' ? 500 : 409;
			return NextResponse.json({ error: claimed.error }, { status });
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'game_claim_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}

export async function postGameJoinRoute(
	request: NextRequest,
	context: GameRouteContext
): Promise<NextResponse> {
	try {
		const member = requireConfirmedGameUser(request);
		if (!member.ok) return member.response;

		const shortCode = await readShortCode(context);
		if (!shortCode) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const joined = joinRegularGame(joinRegularGameDeps, {
			shortCode,
			steamId64: member.steamId64
		});

		if (!joined.ok) {
			if (joined.error === 'mission_not_found') {
				return NextResponse.json({ error: joined.error }, { status: 404 });
			}
			const status = joined.error === 'database_error' ? 500 : 409;
			return NextResponse.json({ error: joined.error }, { status });
		}

		return NextResponse.json({ success: true, joined: joined.joined });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'game_join_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}

export async function postGameSwitchSlotRoute(
	request: NextRequest,
	context: GameRouteContext
): Promise<NextResponse> {
	try {
		const member = requireConfirmedGameUser(request);
		if (!member.ok) return member.response;

		const shortCode = await readShortCode(context);
		if (!shortCode) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		let body: unknown;
		try {
			body = await readRequestBody(request);
		} catch {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const parsed = claimPrioritySlotRequestSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const switched = switchPrioritySlot(switchPrioritySlotDeps, {
			shortCode,
			slotId: parsed.data.slotId,
			steamId64: member.steamId64
		});

		if (!switched.ok) {
			if (switched.error === 'mission_not_found' || switched.error === 'slot_not_found') {
				return NextResponse.json({ error: switched.error }, { status: 404 });
			}
			const status = switched.error === 'database_error' ? 500 : 409;
			return NextResponse.json({ error: switched.error }, { status });
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'game_switch_slot_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}

export async function postGameLeaveRoute(
	request: NextRequest,
	context: GameRouteContext
): Promise<NextResponse> {
	try {
		const member = requireConfirmedGameUser(request);
		if (!member.ok) return member.response;

		const shortCode = await readShortCode(context);
		if (!shortCode) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const left = leaveRegularGame(leaveRegularGameDeps, {
			shortCode,
			steamId64: member.steamId64
		});

		if (!left.ok) {
			if (left.error === 'mission_not_found') {
				return NextResponse.json({ error: left.error }, { status: 404 });
			}
			return NextResponse.json({ error: 'database_error' }, { status: 500 });
		}

		return NextResponse.json({ success: true, left: left.left });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'game_leave_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}

export async function postGameLeaveSlotRoute(
	request: NextRequest,
	context: GameRouteContext
): Promise<NextResponse> {
	try {
		const member = requireConfirmedGameUser(request);
		if (!member.ok) return member.response;

		const shortCode = await readShortCode(context);
		if (!shortCode) {
			return NextResponse.json({ error: 'validation_error' }, { status: 400 });
		}

		const left = leavePrioritySlot(leavePrioritySlotDeps, {
			shortCode,
			steamId64: member.steamId64
		});

		if (!left.ok) {
			if (left.error === 'mission_not_found') {
				return NextResponse.json({ error: left.error }, { status: 404 });
			}
			const status = left.error === 'database_error' ? 500 : 409;
			return NextResponse.json({ error: left.error }, { status });
		}

		return NextResponse.json({ success: true, left: left.left });
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'game_leave_slot_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}
