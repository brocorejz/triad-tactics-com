import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentGameDeps } from '@/features/games/deps';
import { getCurrentGame } from '@/features/games/useCases/getCurrentGame';
import { WelcomePage } from '@/features/welcome/ui/root';
import { STEAM_SESSION_COOKIE } from '@/features/steamAuth/sessionCookie';
import { steamAuthDeps } from '@/features/steamAuth/deps';
import { getUserFlowRedirect } from '@/features/steamAuth/useCases/userFlowRedirect';
import { getUserStatus } from '@/features/users/useCases/getUserStatus';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const cookieStore = await cookies();
	const sid = cookieStore.get(STEAM_SESSION_COOKIE)?.value ?? null;
	const status = getUserStatus(steamAuthDeps, sid);

	const flowRedirect = getUserFlowRedirect(locale, status);
	if (flowRedirect) redirect(flowRedirect);

	let currentGame: ReturnType<typeof getCurrentGame> = null;
	try {
		currentGame = getCurrentGame(getCurrentGameDeps);
	} catch {
		currentGame = null;
	}

	return (
		<WelcomePage currentGame={currentGame} />
	);
}
