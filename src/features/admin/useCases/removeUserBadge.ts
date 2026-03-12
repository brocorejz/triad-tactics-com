import type { AdminUserBadge } from '@/features/admin/domain/types';
import type { RemoveUserBadgeDeps } from '../ports';

export type RemoveUserBadgeResult =
	| { ok: true; badges: AdminUserBadge[] }
	| { ok: false; error: 'not_found' | 'database_error' };

export function removeUserBadge(
	deps: RemoveUserBadgeDeps,
	input: { userId: number; badgeTypeId: number }
): RemoveUserBadgeResult {
	const result = deps.repo.removeBadgeFromUser(input);
	if (result.success) {
		return { ok: true, badges: result.badges };
	}

	return { ok: false, error: result.error };
}
