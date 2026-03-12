import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../../../../fixtures/dbOperations';
import { setupIsolatedDb } from '../../../../fixtures/isolatedDb';
import { createSteamSession } from '../../../../fixtures/steamSession';

const ADMIN_STEAM_ID = '76561198012345678';

async function loadAdminGameAuditHarness() {
	const { dbOperations } = await import('../../../../fixtures/dbOperations');
	const { GET } = await import('@/app/api/admin/games/[missionId]/audit/route');
	const { NextRequest } = await import('next/server');
	return { dbOperations, GET, NextRequest };
}

function missionRouteContext(missionId: number | string) {
	return {
		params: Promise.resolve({ missionId: String(missionId) })
	};
}

function insertMission(status: 'draft' | 'published' | 'archived', shortCode: string): number {
	const db = getDb();
	const result = db.prepare(`
		INSERT INTO missions (
			short_code,
			status,
			title,
			description,
			slotting_json,
			published_at,
			archived_at,
			archive_status,
			created_by_steamid64,
			updated_by_steamid64,
			published_by_steamid64,
			archived_by_steamid64
		)
		VALUES (?, ?, 'Operation Audit', '', ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(
		shortCode,
		status,
		JSON.stringify({ sides: [] }),
		status === 'published' || status === 'archived' ? '2026-03-10 10:00:00' : null,
		status === 'archived' ? '2026-03-10 12:00:00' : null,
		status === 'archived' ? 'completed' : null,
		ADMIN_STEAM_ID,
		ADMIN_STEAM_ID,
		status === 'published' || status === 'archived' ? ADMIN_STEAM_ID : null,
		status === 'archived' ? ADMIN_STEAM_ID : null
	);

	const rowId = result.lastInsertRowid;
	return typeof rowId === 'bigint' ? Number(rowId) : rowId;
}

function insertUser(steamId64: string, callsign: string): number {
	const db = getDb();
	const userInfo = db.prepare('INSERT INTO users (current_callsign) VALUES (?)').run(callsign);
	const userIdRaw = userInfo.lastInsertRowid;
	const userId = typeof userIdRaw === 'bigint' ? Number(userIdRaw) : userIdRaw;
	db.prepare(
		`INSERT INTO user_identities (user_id, provider, provider_user_id) VALUES (?, 'steam', ?)`
	).run(userId, steamId64);
	return userId;
}

function insertAuditEvent(input: {
	missionId: number;
	eventType: string;
	payload: unknown;
	createdAt: string;
	actorUserId?: number | null;
	actorSteamId64?: string | null;
}) {
	getDb().prepare(`
		INSERT INTO mission_audit_events (
			mission_id,
			actor_user_id,
			actor_steamid64,
			event_type,
			payload,
			created_at
		)
		VALUES (?, ?, ?, ?, ?, ?)
	`).run(
		input.missionId,
		input.actorUserId ?? null,
		input.actorSteamId64 ?? null,
		input.eventType,
		JSON.stringify(input.payload),
		input.createdAt
	);
}

describe('Admin game audit endpoint (integration)', () => {
	beforeAll(async () => {
		await setupIsolatedDb({
			prefix: 'triad-tactics-admin-game-audit-test',
			adminSteamIds: ADMIN_STEAM_ID
		});
	});

	beforeEach(async () => {
		const { dbOperations } = await import('../../../../fixtures/dbOperations');
		dbOperations.clearAll();
	});

	it('returns mission audit history newest first with parsed payloads and actor info', async () => {
		const { dbOperations, GET, NextRequest } = await loadAdminGameAuditHarness();
		const missionId = insertMission('published', 'OP-AUDIT');
		const adminUserId = insertUser(ADMIN_STEAM_ID, 'AdminAlpha');
		insertAuditEvent({
			missionId,
			eventType: 'mission.settings.updated',
			createdAt: '2026-03-10 10:00:00',
			actorUserId: adminUserId,
			actorSteamId64: ADMIN_STEAM_ID,
			payload: {
				before: { title: '' },
				after: { title: 'Operation Audit' }
			}
		});
		insertAuditEvent({
			missionId,
			eventType: 'mission.slotting.updated',
			createdAt: '2026-03-10 11:00:00',
			actorSteamId64: ADMIN_STEAM_ID,
			payload: {
				source: 'canonical',
				before: { sides: [] },
				after: { sides: [{ id: 'usk' }] }
			}
		});
		const adminSid = createSteamSession(dbOperations, {
			steamid64: ADMIN_STEAM_ID,
			redirectPath: '/en/admin/games'
		});

		const res = await GET(
			new NextRequest(`http://localhost/api/admin/games/${missionId}/audit`, {
				headers: { cookie: `tt_steam_session=${adminSid}` }
			}),
			missionRouteContext(missionId)
		);

		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.success).toBe(true);
		expect(json.events).toHaveLength(2);
		expect(json.events[0]).toEqual(
			expect.objectContaining({
				eventType: 'mission.slotting.updated',
				actorUserId: null,
				actorSteamId64: ADMIN_STEAM_ID,
				actorCallsign: 'AdminAlpha',
				payload: {
					source: 'canonical',
					before: { sides: [] },
					after: { sides: [{ id: 'usk' }] }
				}
			})
		);
		expect(json.events[1]).toEqual(
			expect.objectContaining({
				eventType: 'mission.settings.updated',
				actorUserId: adminUserId,
				actorSteamId64: ADMIN_STEAM_ID,
				actorCallsign: 'AdminAlpha',
				payload: {
					before: { title: '' },
					after: { title: 'Operation Audit' }
				}
			})
		);
	});

	it('returns audit history for archived missions too', async () => {
		const { dbOperations, GET, NextRequest } = await loadAdminGameAuditHarness();
		const missionId = insertMission('archived', 'OP-AUDIT-ARCHIVED');
		insertUser(ADMIN_STEAM_ID, 'AdminAlpha');
		insertAuditEvent({
			missionId,
			eventType: 'mission.archived',
			createdAt: '2026-03-10 12:00:00',
			actorSteamId64: ADMIN_STEAM_ID,
			payload: {
				archiveStatus: 'completed',
				archiveResult: { outcome: 'winner', winnerSideId: 'usk', sideScores: [] }
			}
		});
		const adminSid = createSteamSession(dbOperations, {
			steamid64: ADMIN_STEAM_ID,
			redirectPath: '/en/admin/games'
		});

		const res = await GET(
			new NextRequest(`http://localhost/api/admin/games/${missionId}/audit`, {
				headers: { cookie: `tt_steam_session=${adminSid}` }
			}),
			missionRouteContext(missionId)
		);

		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.success).toBe(true);
		expect(json.events).toHaveLength(1);
		expect(json.events[0]).toEqual(
			expect.objectContaining({
				eventType: 'mission.archived',
				payload: {
					archiveStatus: 'completed',
					archiveResult: { outcome: 'winner', winnerSideId: 'usk', sideScores: [] }
				}
			})
		);
	});

	it('returns not found when the mission does not exist', async () => {
		const { dbOperations, GET, NextRequest } = await loadAdminGameAuditHarness();
		const adminSid = createSteamSession(dbOperations, {
			steamid64: ADMIN_STEAM_ID,
			redirectPath: '/en/admin/games'
		});

		const res = await GET(
			new NextRequest('http://localhost/api/admin/games/999/audit', {
				headers: { cookie: `tt_steam_session=${adminSid}` }
			}),
			missionRouteContext(999)
		);

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'not_found' });
	});
});
