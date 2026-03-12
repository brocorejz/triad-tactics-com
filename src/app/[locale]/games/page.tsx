import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import GamesHubPage from '@/features/games/ui/GamesHubPage';
import { getGameArchiveSummariesDeps, getCurrentGameDeps } from '@/features/games/deps';
import { getGameArchiveSummaries } from '@/features/games/useCases/getGameArchiveSummaries';
import { getCurrentGame } from '@/features/games/useCases/getCurrentGame';
import { STEAM_SESSION_COOKIE } from '@/features/steamAuth/sessionCookie';
import { steamAuthDeps } from '@/features/steamAuth/deps';
import { getUserFlowRedirect } from '@/features/steamAuth/useCases/userFlowRedirect';
import { isConfirmedByAccessLevel } from '@/features/users/domain/api';
import { getUserStatus } from '@/features/users/useCases/getUserStatus';

export default async function GamesRoutePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const cookieStore = await cookies();
	const sid = cookieStore.get(STEAM_SESSION_COOKIE)?.value ?? null;
	const status = getUserStatus(steamAuthDeps, sid);

	const flowRedirect = getUserFlowRedirect(locale, status);
	if (flowRedirect) redirect(flowRedirect);

	if (!status.connected || !isConfirmedByAccessLevel(status.accessLevel)) {
		redirect(`/${locale}`);
	}

	const current = getCurrentGame(getCurrentGameDeps);
	const archive = getGameArchiveSummaries(getGameArchiveSummariesDeps);
	if (!archive.ok) {
		throw new Error('games_archive_load_failed');
	}

	return <GamesHubPage current={current} archive={archive.archive} />;
}
