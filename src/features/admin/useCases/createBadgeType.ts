import type { AdminBadgeType } from '@/features/admin/domain/types';
import type { CreateBadgeTypeDeps } from '../ports';

export type CreateBadgeTypeResult =
	| { ok: true; badge: AdminBadgeType }
	| { ok: false; error: 'database_error' };

export function createBadgeType(
	deps: CreateBadgeTypeDeps,
	input: { label: string; createdBySteamId64: string }
): CreateBadgeTypeResult {
	const result = deps.repo.createBadgeType(input);
	if (result.success) {
		return { ok: true, badge: result.badge };
	}

	return { ok: false, error: result.error };
}
