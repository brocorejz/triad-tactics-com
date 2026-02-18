import { NextRequest, NextResponse } from 'next/server';
import {
	DISCORD_BOT_TOKEN,
	DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET,
	DISCORD_CONFIRMED_ROLE_ID,
	DISCORD_GUILD_ID,
	DISCORD_REDIRECT_URI,
	DISCORD_REDIRECT_URI_LOCAL
} from '@/platform/env';
import { withApiGuards } from '@/platform/apiGates';
import { errorToLogObject, logger } from '@/platform/logger';
import { STEAM_SESSION_COOKIE } from '@/features/steamAuth/sessionCookie';
import { getSteamIdentity } from '@/features/steamAuth/useCases/getSteamIdentity';
import { steamAuthDeps } from '@/features/steamAuth/deps';
import { setDiscordIdentityByUserId } from '@/features/users/infra/sqliteUsers';
import { getRequestOrigin } from '@/features/steamAuth/adapters/next/origin';
import { defaultLocale } from '@/i18n/locales';
import { DISCORD_FETCH_TIMEOUT_MS, DISCORD_OAUTH_STATE_COOKIE } from './oauthStateCookie';

type DiscordTokenResponse = {
	access_token?: string;
	token_type?: string;
};

type DiscordUserResponse = {
	id?: string;
	username?: string;
};

function getDiscordRedirectUri(): string | null {
	const isDev = process.env.NODE_ENV !== 'production';
	return isDev ? (DISCORD_REDIRECT_URI_LOCAL ?? null) : (DISCORD_REDIRECT_URI ?? null);
}

function redirectToHome(request: NextRequest, reason?: string, clearOAuthStateCookie = false): NextResponse {
	const url = new URL('/', getRequestOrigin(request));
	if (reason) {
		url.searchParams.set('discord', reason);
	}

	const response = NextResponse.redirect(url);
	if (clearOAuthStateCookie) {
		response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, '', {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: 0
		});
	}

	return response;
}

function redirectToAuthError(request: NextRequest, message: string, clearOAuthStateCookie = false): NextResponse {
	const url = new URL(`/${defaultLocale}/auth/error`, getRequestOrigin(request));
	url.searchParams.set('message', message);

	const response = NextResponse.redirect(url);
	if (clearOAuthStateCookie) {
		response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, '', {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: 0
		});
	}

	return response;
}

async function getDiscordCallbackRoute(request: NextRequest): Promise<NextResponse> {
	try {
		const code = request.nextUrl.searchParams.get('code');
		if (!code) {
			return redirectToHome(request);
		}

		const stateParam = request.nextUrl.searchParams.get('state');
		const stateCookie = request.cookies.get(DISCORD_OAUTH_STATE_COOKIE)?.value ?? null;
		if (!stateParam || !stateCookie || stateParam !== stateCookie) {
			logger.warn(
				{
					has_state_param: Boolean(stateParam),
					has_state_cookie: Boolean(stateCookie)
				},
				'discord_oauth_state_invalid'
			);
			return redirectToAuthError(request, 'discord_oauth_state_invalid', true);
		}

		const sid = request.cookies.get(STEAM_SESSION_COOKIE)?.value ?? null;
		const identity = getSteamIdentity(steamAuthDeps, sid);
		if (!identity.connected) {
			return redirectToHome(request, undefined, true);
		}

		const user = steamAuthDeps.users.getUserBySteamId64(identity.steamid64);
		if (!user?.id || !user.player_confirmed_at) {
			return redirectToHome(request, undefined, true);
		}

		const redirectUri = getDiscordRedirectUri();
		if (
			!DISCORD_CLIENT_ID ||
			!DISCORD_CLIENT_SECRET ||
			!DISCORD_BOT_TOKEN ||
			!DISCORD_GUILD_ID ||
			!DISCORD_CONFIRMED_ROLE_ID ||
			!redirectUri
		) {
			logger.warn('discord_env_missing');
			return redirectToAuthError(request, 'discord_env_missing', true);
		}

		const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: DISCORD_CLIENT_ID,
				client_secret: DISCORD_CLIENT_SECRET,
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri
			}),
			signal: AbortSignal.timeout(DISCORD_FETCH_TIMEOUT_MS)
		});

		if (!tokenRes.ok) {
			logger.warn({ status: tokenRes.status }, 'discord_token_exchange_failed');
			return redirectToAuthError(request, 'discord_token_exchange_failed', true);
		}

		const tokenJson = (await tokenRes.json()) as DiscordTokenResponse;
		const accessToken = tokenJson.access_token;
		if (!accessToken) {
			logger.warn('discord_access_token_missing');
			return redirectToAuthError(request, 'discord_access_token_missing', true);
		}

		const meRes = await fetch('https://discord.com/api/users/@me', {
			headers: {
				Authorization: `Bearer ${accessToken}`
			},
			signal: AbortSignal.timeout(DISCORD_FETCH_TIMEOUT_MS)
		});

		if (!meRes.ok) {
			logger.warn({ status: meRes.status }, 'discord_user_fetch_failed');
			return redirectToAuthError(request, 'discord_user_fetch_failed', true);
		}

		const meJson = (await meRes.json()) as DiscordUserResponse;
		const discordId = meJson.id;
		if (!discordId) {
			logger.warn('discord_user_id_missing');
			return redirectToAuthError(request, 'discord_user_id_missing', true);
		}

		const update = setDiscordIdentityByUserId({
			userId: user.id,
			discordId,
			discordToken: accessToken
		});
		if (!update.success) {
			logger.warn('discord_user_update_failed');
			return redirectToAuthError(request, 'discord_user_update_failed', true);
		}

		const guildRes = await fetch(
			`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
			{
				method: 'PUT',
				headers: {
					Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ access_token: accessToken }),
				signal: AbortSignal.timeout(DISCORD_FETCH_TIMEOUT_MS)
			}
		);

		if (!guildRes.ok) {
			logger.warn({ status: guildRes.status }, 'discord_guild_join_failed');
			return redirectToAuthError(request, 'discord_guild_join_failed', true);
		}

		const roleRes = await fetch(
			`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIRMED_ROLE_ID}`,
			{
				method: 'PUT',
				headers: {
					Authorization: `Bot ${DISCORD_BOT_TOKEN}`
				},
				signal: AbortSignal.timeout(DISCORD_FETCH_TIMEOUT_MS)
			}
		);
		if (!roleRes.ok) {
			logger.warn({ status: roleRes.status }, 'discord_role_assign_failed');
			return redirectToAuthError(request, 'discord_role_assign_failed', true);
		}

		return redirectToHome(request, undefined, true);
	} catch (error: unknown) {
		logger.warn({ ...errorToLogObject(error) }, 'discord_callback_route_failed');
		return redirectToAuthError(request, 'discord_callback_route_failed', true);
	}
}

export const runtime = 'nodejs';

export const GET = withApiGuards(getDiscordCallbackRoute, { name: 'api.auth.discord.callback' });
