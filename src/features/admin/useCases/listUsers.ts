import type { AdminUserRow } from '@/features/admin/domain/types';
import type { ListUsersDeps } from '../ports';

export type ListUsersResult = {
	page: number;
	pageSize: number;
	totalPages: number;
	total: number;
	users: AdminUserRow[];
	counts: { all: number; renameRequired: number; confirmed: number };
};

export function listUsers(
	deps: ListUsersDeps,
	input: { status: 'all' | 'rename_required' | 'confirmed'; query?: string; page: number; pageSize: number }
): ListUsersResult {
	const total = deps.repo.countUsers({ status: input.status, query: input.query });
	const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
	const page = Math.min(Math.max(1, input.page), totalPages);
	const users = deps.repo.listUsersPage({
		status: input.status,
		query: input.query,
		page,
		pageSize: input.pageSize
	});
	return {
		page,
		pageSize: input.pageSize,
		totalPages,
		total,
		users,
		counts: {
			all: deps.repo.countUsersByStatus('all'),
			renameRequired: deps.repo.countUsersByStatus('rename_required'),
			confirmed: deps.repo.countUsersByStatus('confirmed')
		}
	};
}
