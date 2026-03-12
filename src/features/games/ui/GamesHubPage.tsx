'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { CurrentGameSummary, GameArchiveResult, GameArchiveSummary } from '@/features/games/domain/types';
import type { AppLocale } from '@/i18n/locales';
import { formatCountdownValue, formatViewerDate, getCountdownParts } from './missionPageUtils';
import { CountdownSegment } from './missionPageComponents';

type Props = {
	current: CurrentGameSummary | null;
	archive: GameArchiveSummary[];
};

function renderArchiveResult(result: GameArchiveResult | null, t: ReturnType<typeof useTranslations<'games'>>): string {
	if (!result) return t('archiveNoResult');
	if (result.outcome === 'draw') return t('archiveResultDraw');
	if (!result.winnerSideId) return t('archiveNoResult');
	const winner = result.sideScores.find((s) => s.sideId === result.winnerSideId);
	return t('archiveResultWinner', { side: winner?.sideName ?? result.winnerSideId });
}

function renderArchiveScores(result: GameArchiveResult | null): string | null {
	if (!result || result.sideScores.length === 0) return null;
	return result.sideScores.map((score) => `${score.sideName} ${score.score}`).join(' / ');
}

export default function GamesHubPage({ current, archive }: Props) {
	const t = useTranslations('games');
	const locale = useLocale();
	const [timeZone, setTimeZone] = useState<string | null>(null);
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
		setNow(Date.now());
		const timer = window.setInterval(() => setNow(Date.now()), 1_000);
		return () => window.clearInterval(timer);
	}, []);

	const currentStartsAt = formatViewerDate(current?.startsAt ?? null, locale, timeZone);
	const startTimestamp = current?.startsAt ? new Date(current.startsAt).getTime() : null;
	const currentIsLive = startTimestamp !== null && now !== null ? startTimestamp <= now : false;
	const countdown = now !== null && startTimestamp !== null && startTimestamp > now ? getCountdownParts(startTimestamp, now) : null;
	const timeZoneDisplay = timeZone ? timeZone.replace(/\//g, ' / ') : null;

	return (
		<section className="grid gap-6">
			<div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-sm shadow-black/20 sm:p-8">
				<p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">{t('hubEyebrow')}</p>
				<h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">{t('hubTitle')}</h2>
				<p className="mt-2 max-w-2xl text-sm text-neutral-300 sm:text-base">{t('hubSubtitle')}</p>
			</div>

			{current ? (
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
			) : (
				<div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/70 p-5 shadow-sm shadow-black/20 sm:p-8">
					<h3 className="text-xl font-semibold tracking-tight text-neutral-50">{t('noCurrentTitle')}</h3>
					<p className="mt-2 max-w-2xl text-sm text-neutral-300 sm:text-base">{t('noCurrentText')}</p>
				</div>
			)}

			<details className="group rounded-2xl border border-neutral-800 bg-neutral-950 shadow-sm shadow-black/20">
				<summary className="flex cursor-pointer list-none items-center justify-between p-5 sm:p-8 [&::-webkit-details-marker]:hidden">
					<div className="space-y-2">
						<h3 className="text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl">{t('archiveTitle')}</h3>
						<p className="text-sm text-neutral-300 sm:text-base">{t('archiveSubtitle')}</p>
					</div>
					<svg
						className="ml-3 h-5 w-5 shrink-0 text-neutral-400 transition-transform group-open:rotate-180"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
						aria-hidden="true"
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
					</svg>
				</summary>

				<div className="px-5 pb-5 sm:px-8 sm:pb-8">
				{archive.length === 0 ? (
					<p className="text-sm text-neutral-400">{t('archiveEmpty')}</p>
				) : (
					<div className="grid gap-3">
						{archive.map((mission) => {
							const startsAt = formatViewerDate(mission.startsAt, locale, timeZone);
							const archivedAt = formatViewerDate(mission.archivedAt, locale, timeZone);
							const scoreLine = renderArchiveScores(mission.archiveResult);
							return (
								<Link
									key={mission.shortCode}
									href={`/games/${mission.shortCode}`}
									className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 transition hover:border-[color:var(--accent)]/35 hover:bg-white/[0.03]"
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<h4 className="text-lg font-semibold tracking-tight text-neutral-50">{mission.title}</h4>
												<span className="inline-flex items-center rounded-full border border-neutral-800 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300">

													{mission.archiveStatus === 'completed' ? t('completedBadge') : t('canceledBadge')}
												</span>
											</div>
											<p className="mt-2 text-sm text-neutral-300">{(mission.description[locale as AppLocale] || mission.description.en) || t('archiveDescriptionFallback')}</p>
										</div>
										<div className="text-sm text-neutral-400">
											<div>{startsAt ? `${t('startsAtLabel')}: ${startsAt}` : null}</div>
											<div>{archivedAt ? `${t('archivedAtLabel')}: ${archivedAt}` : null}</div>
										</div>
									</div>

									<div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-300">
										<span>{t('archiveResultLabel')}: {renderArchiveResult(mission.archiveResult, t)}</span>
										{scoreLine ? <span>{t('archiveScoresLabel')}: {scoreLine}</span> : null}
										{mission.archiveStatus === 'canceled' && mission.archiveReason ? (
											<span>{t('archiveReasonLabel')}: {mission.archiveReason}</span>
										) : null}
									</div>
								</Link>
							);
						})}
					</div>
				)}
				</div>
			</details>
		</section>
	);
}
