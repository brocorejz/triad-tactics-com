'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { CurrentGameSummary } from '@/features/games/domain/types';
import type { AppLocale } from '@/i18n/locales';
import { formatTimeZoneDisplay, parseDateTimeValue } from '@/platform/dateTime';
import { useCurrentTime } from '@/platform/useCurrentTime';
import { useViewerDateTimePreferences } from '@/platform/useViewerDateTimePreferences';
import { CountdownSegment } from './missionPageComponents';
import { formatCountdownValue, formatViewerDate, getCountdownParts } from './missionPageUtils';

export default function CurrentGameMissionCard({ current }: { current: CurrentGameSummary }) {
	const t = useTranslations('games');
	const locale = useLocale();
	const { timeZone, hourCycle } = useViewerDateTimePreferences();
	const now = useCurrentTime();

	const currentStartsAt = formatViewerDate(current.startsAt, locale, timeZone, hourCycle);
	const startDate = current.startsAt ? parseDateTimeValue(current.startsAt) : null;
	const startTimestamp = startDate ? startDate.getTime() : null;
	const currentIsLive = startTimestamp !== null && now !== null ? startTimestamp <= now : false;
	const countdown = now !== null && startTimestamp !== null && startTimestamp > now ? getCountdownParts(startTimestamp, now) : null;
	const timeZoneDisplay = formatTimeZoneDisplay(timeZone);

	return (
		<Link
			href={`/games/${current.shortCode}`}
			className="group relative block overflow-hidden rounded-2xl border border-[color:var(--accent)]/30 bg-gradient-to-br from-neutral-950 via-neutral-950 to-neutral-900 p-5 shadow-sm shadow-black/20 transition hover:border-[color:var(--accent)]/60 hover:shadow-[0_0_30px_rgba(210,184,83,0.12)] sm:p-8"
		>
			<div className="pointer-events-none absolute -top-24 right-6 h-56 w-56 rounded-full bg-[color:var(--accent)]/15 blur-3xl" aria-hidden="true" />
			<div className="pointer-events-none absolute -top-20 right-8 h-40 w-40 rounded-full bg-[color:var(--accent)]/20 blur-3xl" aria-hidden="true" />
			<div className="pointer-events-none absolute -bottom-24 left-6 h-48 w-48 rounded-full bg-[color:var(--accent)]/10 blur-3xl" aria-hidden="true" />

			<div className="relative grid gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<span className="inline-flex items-center rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
						{currentIsLive ? t('currentBadge') : t('upcomingBadge')}
					</span>
					{currentIsLive ? (
						<span className="flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)]">
							<span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_12px_rgba(210,184,83,0.9)]" />
							{t('countdownLiveNow')}
						</span>
					) : null}
				</div>

				<h3 className="text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">{current.title}</h3>

				{countdown ? (
					<>
						<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{t('countdownTitle')}</p>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<CountdownSegment value={formatCountdownValue(countdown.days)} label={t('countdownDays')} />
							<CountdownSegment value={formatCountdownValue(countdown.hours)} label={t('countdownHours')} />
							<CountdownSegment value={formatCountdownValue(countdown.minutes)} label={t('countdownMinutes')} />
							<CountdownSegment value={formatCountdownValue(countdown.seconds)} label={t('countdownSeconds')} />
						</div>
					</>
				) : null}

				{currentStartsAt ? (
					<div className="inline-flex w-fit items-center rounded-full border border-neutral-800 bg-neutral-950/80 px-3 py-1 text-xs font-semibold text-neutral-300">
						{t('startsAtLabel')}: {currentStartsAt}
					</div>
				) : null}

				{timeZoneDisplay ? (
					<div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
						<span className="inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]/70" />
						<span>{t('localTimeHint', { timezone: timeZoneDisplay })}</span>
					</div>
				) : null}

				<div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

				<div className="rounded-2xl bg-white/[0.03] px-4 py-3">
					<p className="max-w-4xl whitespace-pre-line text-sm text-neutral-200">
						{(current.description[locale as AppLocale] || current.description.en) || t('currentDescriptionFallback')}
					</p>
				</div>

				<div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--accent)] transition group-hover:gap-3">
					{t('openMission')}
					<svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
						<path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
					</svg>
				</div>
			</div>
		</Link>
	);
}
