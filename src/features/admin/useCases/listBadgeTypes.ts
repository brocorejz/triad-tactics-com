import type { AdminBadgeType } from '@/features/admin/domain/types';
import type { ListBadgeTypesDeps } from '../ports';

export function listBadgeTypes(deps: ListBadgeTypesDeps): { badges: AdminBadgeType[] } {
	return { badges: deps.repo.listBadgeTypes() };
}
