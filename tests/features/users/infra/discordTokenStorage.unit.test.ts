import { beforeEach, describe, expect, it } from 'vitest';
import { getDiscordTokenByUserId, setDiscordIdentityByUserId } from '@/features/users/infra/sqliteUsers';
import { dbOperations, getDb } from '../../../fixtures/dbOperations';
import { setupIsolatedDb } from '../../../fixtures/isolatedDb';

describe('Discord token storage', () => {
	beforeEach(async () => {
		process.env.DISCORD_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString('base64');
		await setupIsolatedDb('triad-tactics-discord-token-storage');
	});

	it('stores encrypted token and decrypts only when requested', () => {
		const ensured = dbOperations.getOrCreateUserBySteamId64({ steamid64: '76561198000000000' });
		expect(ensured.success).toBe(true);
		if (!ensured.success) return;

		const token = 'discord-oauth-token';
		const result = setDiscordIdentityByUserId({
			userId: ensured.user.id,
			discordId: '123456789012345678',
			discordToken: token
		});
		expect(result.success).toBe(true);

		const db = getDb();
		const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
		expect(columns.some((column) => column.name === 'discord_token')).toBe(false);

		const row = db
			.prepare(
				`
				SELECT discord_id, discord_token_encrypted, discord_token_iv
				FROM users
				WHERE id = ?
			`
			)
			.get(ensured.user.id) as
			| {
					discord_id: string | null;
					discord_token_encrypted: string | null;
					discord_token_iv: string | null;
			  }
			| undefined;

		expect(row?.discord_id).toBe('123456789012345678');
		expect(row?.discord_token_encrypted).toBeTruthy();
		expect(row?.discord_token_iv).toBeTruthy();
		expect(row?.discord_token_encrypted).not.toBe(token);

		const decrypted = getDiscordTokenByUserId(ensured.user.id);
		expect(decrypted).toBe(token);
	});
});
