import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminBadgesPage } from '@/features/admin/ui/root';
import { steamAuthDeps } from '@/features/steamAuth/deps';
import { STEAM_SESSION_COOKIE } from '@/features/steamAuth/sessionCookie';
import { getUserFlowRedirect } from '@/features/steamAuth/useCases/userFlowRedirect';
import { getUserStatus } from '@/features/users/useCases/getUserStatus';

export default async function AdminBadgesGatePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const cookieStore = await cookies();
	const sid = cookieStore.get(STEAM_SESSION_COOKIE)?.value ?? null;
	const status = getUserStatus(steamAuthDeps, sid);

	const flowRedirect = getUserFlowRedirect(locale, status);
	if (flowRedirect) redirect(flowRedirect);

	return <AdminBadgesPage />;
}
