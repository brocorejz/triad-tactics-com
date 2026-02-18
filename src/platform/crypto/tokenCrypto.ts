import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

function getEncryptionKey(): Buffer {
	const keyBase64 = process.env.DISCORD_TOKEN_ENCRYPTION_KEY?.trim();
	if (!keyBase64) {
		throw new Error('discord_token_encryption_key_missing');
	}

	const key = Buffer.from(keyBase64, 'base64');
	if (key.length !== 32) {
		throw new Error('discord_token_encryption_key_invalid');
	}

	return key;
}

export function encryptToken(token: string): { encryptedToken: string; iv: string } {
	const iv = randomBytes(GCM_IV_BYTES);
	const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
	const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	const encryptedWithTag = Buffer.concat([encrypted, authTag]);

	return {
		encryptedToken: encryptedWithTag.toString('base64'),
		iv: iv.toString('base64')
	};
}

export function decryptToken(input: { encryptedToken: string; iv: string }): string {
	const encryptedWithTag = Buffer.from(input.encryptedToken, 'base64');
	if (encryptedWithTag.length <= GCM_TAG_BYTES) {
		throw new Error('discord_token_payload_invalid');
	}

	const encrypted = encryptedWithTag.subarray(0, encryptedWithTag.length - GCM_TAG_BYTES);
	const authTag = encryptedWithTag.subarray(encryptedWithTag.length - GCM_TAG_BYTES);
	const iv = Buffer.from(input.iv, 'base64');

	if (iv.length !== GCM_IV_BYTES) {
		throw new Error('discord_token_iv_invalid');
	}

	const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
	decipher.setAuthTag(authTag);
	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
