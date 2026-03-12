import type { AdminUserBadge } from '@/features/admin/domain/types';
import type { AssignUserBadgeDeps } from '../ports';

export type AssignUserBadgeResult =
	| { ok: true; badges: AdminUserBadge[] }
	| { ok: false; error: 'not_found' | 'badge_retired' | 'database_error' };

export function assignUserBadge(
	deps: AssignUserBadgeDeps,
	input: { userId: number; badgeTypeId: number; assignedBySteamId64: string }
): AssignUserBadgeResult {
	const result = deps.repo.assignBadgeToUser(input);
	if (result.success) {
		return { ok: true, badges: result.badges };
	}

	return { ok: false, error: result.error };
}
