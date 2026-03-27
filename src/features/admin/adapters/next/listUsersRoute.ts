import { NextRequest, NextResponse } from 'next/server';
import { errorToLogObject, logger } from '@/platform/logger';
import { listUsers } from '@/features/admin/useCases/listUsers';
import { listUsersDeps } from '@/features/admin/deps';
import { requireAdmin } from './adminAuth';

const DEFAULT_PAGE_SIZE = 50;

function normalizeStatus(value: string | null): 'all' | 'rename_required' | 'confirmed' {
	if (!value) return 'all';
	const v = value.trim().toLowerCase();
	if (v === 'rename_required' || v === 'rename-required') return 'rename_required';
	if (v === 'confirmed') return 'confirmed';
	return 'all';
}

function normalizePage(value: string | null): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) return 1;
	return parsed;
}

export async function getAdminUsersRoute(request: NextRequest): Promise<NextResponse> {
	try {
		const admin = requireAdmin(request);
		if (!admin.ok) return admin.response;

		const status = normalizeStatus(request.nextUrl.searchParams.get('status'));
		const q = request.nextUrl.searchParams.get('q') ?? '';
		const page = normalizePage(request.nextUrl.searchParams.get('page'));

		const { users, counts, total, totalPages, pageSize, page: resolvedPage } = listUsers(listUsersDeps, {
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
			users
		});
	} catch (error: unknown) {
		logger.error({ ...errorToLogObject(error) }, 'admin_list_users_failed');
		return NextResponse.json({ error: 'server_error' }, { status: 500 });
	}
}
