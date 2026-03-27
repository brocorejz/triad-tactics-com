import type { Application } from '@/features/apply/domain/types';
import type { ListApplicationsDeps } from '../ports';

export type ListApplicationsResult = {
	page: number;
	pageSize: number;
	totalPages: number;
	total: number;
	applications: Application[];
	counts: { active: number; archived: number; total: number };
};

export function listApplications(
	deps: ListApplicationsDeps,
	input: { status: 'active' | 'archived' | 'all'; query?: string; page: number; pageSize: number }
): ListApplicationsResult {
	const total = deps.repo.countApplications({ status: input.status, query: input.query });
	const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
	const page = Math.min(Math.max(1, input.page), totalPages);
	const applications = deps.repo.getApplicationsPage({
		status: input.status,
		query: input.query,
		page,
		pageSize: input.pageSize
	});
	const counts = {
		active: deps.repo.countApplicationsByStatus('active'),
		archived: deps.repo.countApplicationsByStatus('archived'),
		total: deps.repo.countApplicationsByStatus('all')
	};
	return { page, pageSize: input.pageSize, totalPages, total, applications, counts };
}
