import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FeedPage } from '@/features/feed/ui/root';
import { STEAM_SESSION_COOKIE } from '@/features/steamAuth/sessionCookie';
import { steamAuthDeps } from '@/features/steamAuth/deps';
import { getUserFlowRedirect } from '@/features/steamAuth/useCases/userFlowRedirect';
import { getUserStatus } from "@/features/users/useCases/getUserStatus";
import { isConfirmedByAccessLevel } from "@/features/users/domain/api";

export default async function FeedRoutePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const cookieStore = await cookies();
	const sid = cookieStore.get(STEAM_SESSION_COOKIE)?.value ?? null;
	const status = getUserStatus(steamAuthDeps, sid);

	const flowRedirect = getUserFlowRedirect(locale, status);
	if (flowRedirect) redirect(flowRedirect);

	if (!status.connected || (!isConfirmedByAccessLevel(status.accessLevel))) {
		redirect(`/${locale}`);
	}

	return <FeedPage />;
}
