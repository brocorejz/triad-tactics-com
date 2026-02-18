import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';

const ERROR_CODES = new Set([
  'discord_oauth_state_invalid',
  'discord_env_missing',
  'discord_token_exchange_failed',
  'discord_access_token_missing',
  'discord_user_fetch_failed',
  'discord_user_id_missing',
  'discord_user_update_failed',
  'discord_guild_join_failed',
  'discord_role_assign_failed',
  'discord_callback_route_failed',
  'steam_callback_route_failed'
]);

export default async function AuthErrorPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'authError' });
  const { message } = await searchParams;
  const code = typeof message === 'string' ? message.trim() : '';
  const errorMessage = ERROR_CODES.has(code) ? t(`codes.${code}`) : t('defaultMessage');

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-amber-200">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-3 text-sm text-amber-200/90">{errorMessage}</p>
      {code ? <p className="mt-2 text-xs text-amber-200/90">{t('errorCode', { code })}</p> : null}

      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex rounded-lg border border-amber-300/40 bg-amber-200 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
        >
          {t('backHome')}
        </Link>
      </div>
    </section>
  );
}
