import { NextRequest, NextResponse } from 'next/server';
import { listApplications } from '@/features/admin/useCases/listApplications';
import { listApplicationsDeps } from '@/features/admin/deps';
import { errorToLogObject, logger } from '@/platform/logger';
import { requireAdmin } from './adminAuth';

const DEFAULT_PAGE_SIZE = 50;

function normalizeStatus(value: string | null): 'active' | 'archived' | 'all' {
	if (!value) return 'active';
	const v = value.trim().toLowerCase();
	if (v === 'archived') return 'archived';
	if (v === 'all') return 'all';
	return 'active';
}

function normalizePage(value: string | null): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) return 1;
	return parsed;
}

export async function getAdminApplicationsRoute(request: NextRequest): Promise<NextResponse> {
	try {
		const admin = requireAdmin(request);
		if (!admin.ok) return admin.response;

		const status = normalizeStatus(request.nextUrl.searchParams.get('status'));
		const q = request.nextUrl.searchParams.get('q') ?? '';
		const page = normalizePage(request.nextUrl.searchParams.get('page'));

		const { applications, counts, total, totalPages, pageSize, page: resolvedPage } = listApplications(listApplicationsDeps, {
			status,
			query: q,
			page,
			pageSize: DEFAULT_PAGE_SIZE
		});
		return NextResponse.json({
			success: true,
			count: total,
			page: resolvedPage,
			pageSize,
			totalPages,
			counts,
			applications
		});
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'admin_list_applications_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}
