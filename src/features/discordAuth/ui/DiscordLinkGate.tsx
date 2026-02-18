'use client';

import { useTranslations } from 'next-intl';
import { useUserStatus } from '@/features/users/ui/useUserStatus';
import { isConfirmedByAccessLevel } from '@/features/users/domain/api';
import { DiscordLinkButton } from './DiscordLinkButton';

export default function DiscordLinkGate() {
	const t = useTranslations('discordAuth');
	const status = useUserStatus();

	if (!status || !status.connected) return null;
	if (!isConfirmedByAccessLevel(status.accessLevel)) return null;

	return (
		<DiscordLinkButton
			variant={status.discordId ? 'outline' : 'primary'}
			onClick={() => {
				window.location.assign('/api/auth/discord/start/');
			}}>
			{status.discordId ? t('relink') : t('link')}
		</DiscordLinkButton>
	);
}
