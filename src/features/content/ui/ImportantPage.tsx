"use client";

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

type ImportantBlock =
	| { kind: 'title'; text: string }
	| { kind: 'heading'; text: string }
	| { kind: 'paragraph'; text: string }
	| { kind: 'list'; items: string[] }
	| { kind: 'image'; src: string; alt: string };

function renderInline(text: string): ReactNode[] {
	return text
		.split(/(`[^`]+`|\[[^\]]+\]\([^\)]+\)|https?:\/\/\S+)/g)
		.filter(Boolean)
		.map((part, index) => {
			if (part.startsWith('`') && part.endsWith('`')) {
				return (
					<code key={`${part}-${index}`} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.95em] text-neutral-100">
						{part.slice(1, -1)}
					</code>
				);
			}

			const markdownLink = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
			if (markdownLink) {
				const [, label, href] = markdownLink;
				const isExternal = /^https?:\/\//.test(href);
				return (
					<a
						key={`${part}-${index}`}
						href={href}
						target={isExternal ? '_blank' : undefined}
						rel={isExternal ? 'noreferrer' : undefined}
						className="text-[color:var(--accent)] underline decoration-[color:var(--accent)]/40 underline-offset-4 hover:decoration-[color:var(--accent)]"
					>
						{label}
					</a>
				);
			}

			if (/^https?:\/\//.test(part)) {
				return (
					<a
						key={`${part}-${index}`}
						href={part}
						target="_blank"
						rel="noreferrer"
						className="text-[color:var(--accent)] underline decoration-[color:var(--accent)]/40 underline-offset-4 hover:decoration-[color:var(--accent)]"
					>
						{part}
					</a>
				);
			}

			return <span key={`${part}-${index}`}>{part}</span>;
		});
}

function parseMarkdown(content: string): ImportantBlock[] {
	const lines = content.split(/\r?\n/);
	const blocks: ImportantBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const rawLine = lines[index] ?? '';
		const line = rawLine.trim();

		if (!line || line === '---') {
			index += 1;
			continue;
		}

		if (line.startsWith('# ')) {
			blocks.push({ kind: 'title', text: line.slice(2).trim() });
			index += 1;
			continue;
		}

		if (line.startsWith('## ')) {
			blocks.push({ kind: 'heading', text: line.slice(3).trim() });
			index += 1;
			continue;
		}

		const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
		if (imageMatch) {
			const [, alt, src] = imageMatch;
			blocks.push({ kind: 'image', alt: alt ?? '', src: src ?? '' });
			index += 1;
			continue;
		}

		if (line.startsWith('- ')) {
			const items: string[] = [];
			while (index < lines.length) {
				const listLine = (lines[index] ?? '').trim();
				if (!listLine.startsWith('- ')) break;
				items.push(listLine.slice(2).trim());
				index += 1;
			}
			blocks.push({ kind: 'list', items });
			continue;
		}

		const paragraphLines: string[] = [];
		while (index < lines.length) {
			const paragraphLine = (lines[index] ?? '').trim();
			if (!paragraphLine || paragraphLine === '---' || paragraphLine.startsWith('# ') || paragraphLine.startsWith('## ') || paragraphLine.startsWith('- ')) {
				break;
			}
			paragraphLines.push(paragraphLine);
			index += 1;
		}

		if (paragraphLines.length > 0) {
			blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ') });
			continue;
		}

		index += 1;
	}

	return blocks;
}

export default function ImportantPage({ content }: { content: string }) {
	const blocks = parseMarkdown(content);
	const title = blocks.find((block) => block.kind === 'title');
	const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null);

	const closeFullscreen = useCallback(() => setFullscreenImage(null), []);

	useEffect(() => {
		if (!fullscreenImage) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setFullscreenImage(null);
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [fullscreenImage]);

	return (
		<section className="text-sm text-neutral-200">
			<div className="space-y-8 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-6 shadow-sm shadow-black/20 sm:px-6">
				{title && title.kind === 'title' ? (
					<header className="space-y-3 border-b border-neutral-800 pb-6">
						<h1 className="text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
							{renderInline(title.text)}
						</h1>
					</header>
				) : null}

				<div className="space-y-6">
					{blocks.map((block, index) => {
						if (block.kind === 'title') return null;

						if (block.kind === 'heading') {
							return (
								<h2 key={`heading-${index}`} className="text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl">
									{renderInline(block.text)}
								</h2>
							);
						}

						if (block.kind === 'paragraph') {
							return (
								<p key={`paragraph-${index}`} className="max-w-3xl leading-7 text-neutral-300">
									{renderInline(block.text)}
								</p>
							);
						}

						if (block.kind === 'image') {
							return (
								<button
									key={`image-${index}`}
									type="button"
									onClick={() => setFullscreenImage({ src: block.src, alt: block.alt })}
									className="block max-w-sm cursor-zoom-in overflow-hidden rounded-2xl border border-white/8 sm:max-w-md"
								>
									<img src={block.src} alt={block.alt} className="w-full" />
								</button>
							);
						}

						return (
							<ul key={`list-${index}`} className="space-y-3">
								{block.items.map((item, itemIndex) => (
									<li
										key={`item-${itemIndex}`}
										className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 leading-7 text-neutral-200"
									>
										{renderInline(item)}
									</li>
								))}
							</ul>
						);
					})}
				</div>
			</div>

			{fullscreenImage ? (
				<div
					role="dialog"
					aria-modal="true"
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
					onClick={closeFullscreen}
				>
					<button
						type="button"
						aria-label="Close image"
						onClick={closeFullscreen}
						className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-neutral-300 transition-colors hover:bg-white/20 hover:text-white"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
					<img
						src={fullscreenImage.src}
						alt={fullscreenImage.alt}
						className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
						onClick={(e) => e.stopPropagation()}
					/>
				</div>
			) : null}
		</section>
	);
}
