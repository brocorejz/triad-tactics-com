import { AdminTabButton } from './AdminTabButton';

type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

function buildPaginationItems(page: number, totalPages: number): PaginationItem[] {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}

	if (page <= 4) {
		return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
	}

	if (page >= totalPages - 3) {
		return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
	}

	return [1, 'ellipsis-left', page - 1, page, page + 1, 'ellipsis-right', totalPages];
}

export function AdminPagination({
	page,
	totalPages,
	summary,
	previousLabel,
	nextLabel,
	onPageChange
}: {
	page: number;
	totalPages: number;
	summary: string;
	previousLabel: string;
	nextLabel: string;
	onPageChange: (page: number) => void;
}) {
	if (totalPages <= 1) return null;

	const items = buildPaginationItems(page, totalPages);

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
			<p className="text-sm text-neutral-300">{summary}</p>
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
					className="inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-neutral-50 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{previousLabel}
				</button>
				{items.map((item, index) =>
					typeof item === 'number' ? (
						<AdminTabButton
							key={item}
							active={item === page}
							onClick={() => onPageChange(item)}
							className="min-w-10 justify-center"
						>
							{item}
						</AdminTabButton>
					) : (
						<span key={`${item}-${index}`} className="px-1 text-sm font-semibold text-neutral-500" aria-hidden="true">
							...
						</span>
					)
				)}
				<button
					type="button"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= totalPages}
					className="inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-neutral-50 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{nextLabel}
				</button>
			</div>
		</div>
	);
}
