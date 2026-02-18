import { NextResponse } from 'next/server';
import { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI, DISCORD_REDIRECT_URI_LOCAL } from '@/platform/env';
import { withApiGuards } from '@/platform/apiGates';
import { DISCORD_OAUTH_STATE_COOKIE, DISCORD_OAUTH_STATE_MAX_AGE_SECONDS } from '../oauthStateCookie';

function getDiscordRedirectUri(): string | null {
	const isDev = process.env.NODE_ENV !== 'production';
	return isDev ? (DISCORD_REDIRECT_URI_LOCAL ?? null) : (DISCORD_REDIRECT_URI ?? null);
}

async function getDiscordStartRoute(): Promise<NextResponse> {
	const redirectUri = getDiscordRedirectUri();
	if (!DISCORD_CLIENT_ID || !redirectUri) {
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}

	const oauthState = crypto.randomUUID();
	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'identify guilds.join',
		state: oauthState
	});

	const response = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
	response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, oauthState, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: DISCORD_OAUTH_STATE_MAX_AGE_SECONDS
	});

	return response;
}

export const runtime = 'nodejs';

export const GET = withApiGuards(getDiscordStartRoute, { name: 'api.auth.discord.start' });
