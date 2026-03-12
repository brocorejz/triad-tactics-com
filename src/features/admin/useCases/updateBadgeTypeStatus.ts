import type { AdminBadgeType } from '@/features/admin/domain/types';
import type { UpdateBadgeTypeStatusDeps } from '../ports';

export type UpdateBadgeTypeStatusResult =
	| { ok: true; badge: AdminBadgeType }
	| { ok: false; error: 'not_found' | 'database_error' };

export function updateBadgeTypeStatus(
	deps: UpdateBadgeTypeStatusDeps,
	input: { badgeTypeId: number; status: 'active' | 'retired'; updatedBySteamId64: string }
): UpdateBadgeTypeStatusResult {
	const result = deps.repo.updateBadgeTypeStatus(input);
	if (result.success) {
		return { ok: true, badge: result.badge };
	}

	return { ok: false, error: result.error };
}
