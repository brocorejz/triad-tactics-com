import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from '@/platform/crypto/tokenCrypto';

describe('tokenCrypto', () => {
	it('round-trips a token with AES-GCM encryption', () => {
		process.env.DISCORD_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
		const original = 'discord-access-token-123';

		const encrypted = encryptToken(original);
		expect(encrypted.encryptedToken).not.toBe(original);
		expect(encrypted.iv).toBeTruthy();

		const decrypted = decryptToken(encrypted);
		expect(decrypted).toBe(original);
	});

	it('fails to decrypt when payload is tampered', () => {
		process.env.DISCORD_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
		const encrypted = encryptToken('secret');
		const tampered = `${encrypted.encryptedToken.slice(0, -2)}ab`;

		expect(() => decryptToken({ encryptedToken: tampered, iv: encrypted.iv })).toThrow();
	});
});
