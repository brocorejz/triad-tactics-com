import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../../../../fixtures/dbOperations';
import { setupIsolatedDb } from '../../../../fixtures/isolatedDb';
import { createSteamSession } from '../../../../fixtures/steamSession';

const ADMIN_STEAM_ID = '76561198012345678';

async function loadAdminBadgesHarness() {
	const { dbOperations } = await import('../../../../fixtures/dbOperations');
	const { GET: GET_BADGES, POST: POST_BADGES } = await import('@/app/api/admin/badges/route');
	const { POST: POST_BADGE_STATUS } = await import('@/app/api/admin/badges/[badgeTypeId]/status/route');
	const { GET: GET_USERS } = await import('@/app/api/admin/users/route');
	const { POST: POST_USER_BADGE, DELETE: DELETE_USER_BADGE } = await import('@/app/api/admin/users/[userId]/badges/route');
	const { NextRequest } = await import('next/server');
	return {
		dbOperations,
		GET_BADGES,
		POST_BADGES,
		POST_BADGE_STATUS,
		GET_USERS,
		POST_USER_BADGE,
		DELETE_USER_BADGE,
		NextRequest
	};
}

function badgeStatusContext(badgeTypeId: number | string) {
	return {
		params: Promise.resolve({ badgeTypeId: String(badgeTypeId) })
	};
}

function userBadgeContext(userId: number | string) {
	return {
		params: Promise.resolve({ userId: String(userId) })
	};
}

function insertBadgeType(label: string): number {
	const db = getDb();
	const result = db.prepare(`
		INSERT INTO badge_types (label, created_by_steamid64, updated_by_steamid64)
		VALUES (?, ?, ?)
	`).run(label, ADMIN_STEAM_ID, ADMIN_STEAM_ID);

	const rowId = result.lastInsertRowid;
	return typeof rowId === 'bigint' ? Number(rowId) : rowId;
}

function insertMission(): number {
	const db = getDb();
	const result = db.prepare(`
		INSERT INTO missions (
			status,
			title,
			description,
			slotting_json,
			created_by_steamid64,
			updated_by_steamid64
		)
		VALUES ('draft', 'Operation Recon', 'Test mission', ?, ?, ?)
	`).run(JSON.stringify({ sides: [] }), ADMIN_STEAM_ID, ADMIN_STEAM_ID);

	const rowId = result.lastInsertRowid;
	return typeof rowId === 'bigint' ? Number(rowId) : rowId;
}

function assignMissionBadge(missionId: number, badgeTypeId: number) {
	getDb()
		.prepare(`
			INSERT INTO mission_priority_badges (mission_id, badge_type_id)
			VALUES (?, ?)
		`)
		.run(missionId, badgeTypeId);
}

describe('Admin badge endpoints (integration)', () => {
	beforeAll(async () => {
		await setupIsolatedDb({
			prefix: 'triad-tactics-admin-badges-test',
			adminSteamIds: ADMIN_STEAM_ID
		});
	});

	beforeEach(async () => {
		const { dbOperations } = await import('../../../../fixtures/dbOperations');
		dbOperations.clearAll();
	});

	it('validates badge creation and lists created badge types', async () => {
		const { dbOperations, GET_BADGES, POST_BADGES, NextRequest } = await loadAdminBadgesHarness();
		const adminSid = createSteamSession(dbOperations, {
			steamid64: ADMIN_STEAM_ID,
			redirectPath: '/en/admin/badges'
		});

		const badResponse = await POST_BADGES(
			new NextRequest('http://localhost/api/admin/badges', {
				method: 'POST',
				headers: {
					origin: 'http://localhost',
					'content-type': 'application/json',
					cookie: `tt_steam_session=${adminSid}`
				},
				body: JSON.stringify({ label: '' })
			})
		);
		expect(badResponse.status).toBe(400);
		expect((await badResponse.json()).error).toBe('validation_error');

		const createResponse = await POST_BADGES(
			new NextRequest('http://localhost/api/admin/badges', {
				method: 'POST',
				headers: {
					origin: 'http://localhost',
					'content-type': 'application/json',
					cookie: `tt_steam_session=${adminSid}`
				},
				body: JSON.stringify({ label: 'Recon' })
			})
		);
		expect(createResponse.status).toBe(200);
		const createJson = await createResponse.json();
		expect(createJson.success).toBe(true);
		expect(createJson.badge.label).toBe('Recon');
		expect(createJson.badge.status).toBe('active');

		const listResponse = await GET_BADGES(
			new NextRequest('http://localhost/api/admin/badges', {
				method: 'GET',
				headers: { cookie: `tt_steam_session=${adminSid}` }
			})
		);
		expect(listResponse.status).toBe(200);
		const listJson = await listResponse.json();
		expect(listJson.success).toBe(true);
		expect(listJson.count).toBe(1);
		expect(listJson.badges[0].label).toBe('Recon');
	});

	it('assigns and removes user badges, and exposes them through the users endpoint', async () => {
		const { dbOperations, GET_BADGES, GET_USERS, POST_USER_BADGE, DELETE_USER_BADGE, NextRequest } =
			await loadAdminBadgesHarness();
		const adminSid = createSteamSession(dbOperations, {
			steamid64: ADMIN_STEAM_ID,
			redirectPath: '/en/admin/users'
		});
		const badgeTypeId = insertBadgeType('Medic');
		const ensured = dbOperations.getOrCreateUserBySteamId64({ steamid64: '76561198000001001' });
		if (!ensured.success || !ensured.user) {
			throw new Error('Expected user to exist');
		}

		const assignResponse = await POST_USER_BADGE(
			new NextRequest(`http://localhost/api/admin/users/${ensured.user.id}/badges`, {
				method: 'POST',
				headers: {
					origin: 'http://localhost',
					'content-type': 'application/json',
					cookie: `tt_steam_session=${adminSid}`
				},
				body: JSON.stringify({ badgeTypeId })
			}),
			userBadgeContext(ensured.user.id)
		);
		expect(assignResponse.status).toBe(200);
		const assignJson = await assignResponse.json();
		expect(assignJson.success).toBe(true);
		expect(assignJson.badges).toHaveLength(1);
		expect(assignJson.badges[0].label).toBe('Medic');

		const usersResponse = await GET_USERS(
			new NextRequest('http://localhost/api/admin/users?status=all', {
				method: 'GET',
				headers: { cookie: `tt_steam_session=${adminSid}` }
			})
		);
		expect(usersResponse.status).toBe(200);
		const usersJson = await usersResponse.json();
		const userRow = usersJson.users.find((row: { id: number }) => row.id === ensured.user.id);
		expect(userRow.badges).toHaveLength(1);
		expect(userRow.badges[0].label).toBe('Medic');

		const badgesResponse = await GET_BADGES(
			new NextRequest('http://localhost/api/admin/badges', {
				method: 'GET',
				headers: { cookie: `tt_steam_session=${adminSid}` }
			})
		);
		const badgesJson = await badgesResponse.json();
		expect(badgesJson.badges[0].user_count).toBe(1);

		const removeResponse = await DELETE_USER_BADGE(
			new NextRequest(`http://localhost/api/admin/users/${ensured.user.id}/badges`, {
				method: 'DELETE',
				headers: {
					origin: 'http://localhost',
					'content-type': 'application/json',
					cookie: `tt_steam_session=${adminSid}`
				},
				body: JSON.stringify({ badgeTypeId })
			}),
			userBadgeContext(ensured.user.id)
		);
		expect(removeResponse.status).toBe(200);
		const removeJson = await removeResponse.json();
		expect(removeJson.success).toBe(true);
		expect(removeJson.badges).toEqual([]);
	});

	it('updates badge status and blocks assignment of retired badges', async () => {
		const { dbOperations, GET_BADGES, POST_BADGE_STATUS, POST_USER_BADGE, NextRequest } =
			await loadAdminBadgesHarness();
		const adminSid = createSteamSession(dbOperations, {
			steamid64: ADMIN_STEAM_ID,
			redirectPath: '/en/admin/badges'
		});
		const badgeTypeId = insertBadgeType('Marksman');
		const missionId = insertMission();
		assignMissionBadge(missionId, badgeTypeId);
		const ensured = dbOperations.getOrCreateUserBySteamId64({ steamid64: '76561198000001002' });
		if (!ensured.success || !ensured.user) {
			throw new Error('Expected user to exist');
		}

		const statusResponse = await POST_BADGE_STATUS(
			new NextRequest(`http://localhost/api/admin/badges/${badgeTypeId}/status`, {
				method: 'POST',
				headers: {
					origin: 'http://localhost',
					'content-type': 'application/json',
					cookie: `tt_steam_session=${adminSid}`
				},
				body: JSON.stringify({ status: 'retired' })
			}),
			badgeStatusContext(badgeTypeId)
		);
		expect(statusResponse.status).toBe(200);
		const statusJson = await statusResponse.json();
		expect(statusJson.success).toBe(true);
		expect(statusJson.badge.status).toBe('retired');

		const listResponse = await GET_BADGES(
			new NextRequest('http://localhost/api/admin/badges', {
				method: 'GET',
				headers: { cookie: `tt_steam_session=${adminSid}` }
			})
		);
		const listJson = await listResponse.json();
		expect(listJson.badges[0].mission_count).toBe(1);
		expect(listJson.badges[0].status).toBe('retired');

		const assignResponse = await POST_USER_BADGE(
			new NextRequest(`http://localhost/api/admin/users/${ensured.user.id}/badges`, {
				method: 'POST',
				headers: {
					origin: 'http://localhost',
					'content-type': 'application/json',
					cookie: `tt_steam_session=${adminSid}`
				},
				body: JSON.stringify({ badgeTypeId })
			}),
			userBadgeContext(ensured.user.id)
		);
		expect(assignResponse.status).toBe(409);
		expect((await assignResponse.json()).error).toBe('badge_retired');
	});
});
