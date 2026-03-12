import type { ReactNode } from 'react';

export function AdminDisclosure({
	summaryLeft,
	summaryRight,
	children
}: {
	summaryLeft: ReactNode;
	summaryRight?: ReactNode;
	children: ReactNode;
}) {
	return (
		<details className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-sm shadow-black/20">
			<summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden [&::marker]:hidden sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">{summaryLeft}</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{summaryRight}
					<svg
						className="h-5 w-5 shrink-0 text-neutral-400 transition-transform group-open:rotate-180"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
						aria-hidden="true"
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
					</svg>
				</div>
			</summary>
			<div className="mt-4">{children}</div>
		</details>
	);
}
