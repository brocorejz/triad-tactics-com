"use client";

import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { formatLocalizedFixedTime, type ViewerHourCycle } from '@/platform/dateTime';
import { useViewerDateTimePreferences } from '@/platform/useViewerDateTimePreferences';

type ImportantBlock =
	| { kind: 'title'; text: string }
	| { kind: 'heading'; text: string }
	| { kind: 'paragraph'; text: string }
	| { kind: 'list'; items: string[] }
	| { kind: 'orderedList'; items: string[] }
	| { kind: 'image'; src: string; alt: string }
	| { kind: 'faq'; question: string; answer: ImportantBlock[] };

type InlineRenderOptions = {
	locale: string;
	timeZone: string | null;
	hourCycle: ViewerHourCycle | null;
};

function renderInline(text: string, options?: InlineRenderOptions): ReactNode[] {
	return text
		.split(/(`[^`]+`|\[[^\]]+\]\([^\)]+\)|https?:\/\/\S+|\b\d{1,2}:\d{2}(?:\s+[^\s`\[\]\(\)]+){0,2}\s+(?:CET|CEST)\b)/g)
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

			const localizedTimeMatch = part.match(/^(\d{1,2}:\d{2})(?:\s+[^\s`\[\]\(\)]+){0,2}\s+(CET|CEST)$/);
			if (localizedTimeMatch) {
				const [, timeValue, sourceZone] = localizedTimeMatch;
				const localizedTime = options
					? formatLocalizedFixedTime(timeValue, {
							locale: options.locale,
							timeZone: options.timeZone,
							hourCycle: options.hourCycle,
							sourceOffsetMinutes: sourceZone === 'CEST' ? 120 : 60
						})
					: null;

				return (
					<time key={`${part}-${index}`} dateTime={timeValue} className="font-medium text-neutral-100">
						{localizedTime ?? timeValue}
					</time>
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
			const headingText = line.slice(3).trim();
			if (/^\d+\.\s+/.test(headingText)) {
				index += 1;
				const answerLines: string[] = [];

				while (index < lines.length) {
					const answerLine = lines[index] ?? '';
					const trimmedAnswerLine = answerLine.trim();
					if (trimmedAnswerLine === '---' || trimmedAnswerLine.startsWith('# ') || trimmedAnswerLine.startsWith('## ')) {
						break;
					}
					answerLines.push(answerLine);
					index += 1;
				}

				blocks.push({ kind: 'faq', question: headingText, answer: parseMarkdown(answerLines.join('\n')) });
				continue;
			}

			blocks.push({ kind: 'heading', text: headingText });
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
				if (!listLine) {
					index += 1;
					continue;
				}
				if (!listLine.startsWith('- ')) break;
				items.push(listLine.slice(2).trim());
				index += 1;
			}
			blocks.push({ kind: 'list', items });
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length) {
				const listLine = (lines[index] ?? '').trim();
				if (!listLine) {
					index += 1;
					continue;
				}
				if (!/^\d+\.\s+/.test(listLine)) break;
				items.push(listLine.replace(/^\d+\.\s+/, '').trim());
				index += 1;
			}
			blocks.push({ kind: 'orderedList', items });
			continue;
		}

		const paragraphLines: string[] = [];
		while (index < lines.length) {
			const paragraphLine = (lines[index] ?? '').trim();
			if (
				!paragraphLine ||
				paragraphLine === '---' ||
				paragraphLine.startsWith('# ') ||
				paragraphLine.startsWith('## ') ||
				paragraphLine.startsWith('- ') ||
				/^\d+\.\s+/.test(paragraphLine)
			) {
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
	const locale = useLocale();
	const { timeZone, hourCycle } = useViewerDateTimePreferences();
	const inlineOptions: InlineRenderOptions = { locale, timeZone, hourCycle };
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

	const renderBlock = (block: ImportantBlock, key: string, compact = false): ReactNode => {
		if (block.kind === 'title') return null;

		if (block.kind === 'heading') {
			return (
				<h2 key={key} className="text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl">
					{renderInline(block.text, inlineOptions)}
				</h2>
			);
		}

		if (block.kind === 'paragraph') {
			return (
				<p key={key} className="max-w-3xl leading-7 text-neutral-300">
					{renderInline(block.text, inlineOptions)}
				</p>
			);
		}

		if (block.kind === 'image') {
			return (
				<button
					key={key}
					type="button"
					onClick={() => setFullscreenImage({ src: block.src, alt: block.alt })}
					className="block max-w-sm cursor-zoom-in overflow-hidden rounded-2xl border border-white/8 sm:max-w-md"
				>
					<img src={block.src} alt={block.alt} className="w-full" />
				</button>
			);
		}

		if (block.kind === 'faq') {
			return (
				<details key={key} className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-sm shadow-black/20">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-neutral-200 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden [&::marker]:hidden">
						<span className="font-semibold text-neutral-100">{renderInline(block.question, inlineOptions)}</span>
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
					</summary>
					<div className="space-y-4 border-t border-neutral-800 px-4 py-3">
						{block.answer.map((answerBlock, answerIndex) => renderBlock(answerBlock, `${key}-answer-${answerIndex}`, true))}
					</div>
				</details>
			);
		}

		if (block.kind === 'orderedList') {
			return (
				<ol key={key} className="ml-5 list-decimal space-y-2 text-neutral-300">
					{block.items.map((item, itemIndex) => (
						<li key={`${key}-item-${itemIndex}`} className="pl-1 leading-7">
							{renderInline(item, inlineOptions)}
						</li>
					))}
				</ol>
			);
		}

		if (compact) {
			return (
				<ul key={key} className="ml-5 list-disc space-y-2 text-neutral-300">
					{block.items.map((item, itemIndex) => (
						<li key={`${key}-item-${itemIndex}`} className="pl-1 leading-7">
							{renderInline(item, inlineOptions)}
						</li>
					))}
				</ul>
			);
		}

		return (
			<ul key={key} className="space-y-3">
				{block.items.map((item, itemIndex) => (
					<li key={`${key}-item-${itemIndex}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 leading-7 text-neutral-200">
						{renderInline(item, inlineOptions)}
					</li>
				))}
			</ul>
		);
	};

	return (
		<section className="text-sm text-neutral-200">
			<div className="space-y-8 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-6 shadow-sm shadow-black/20 sm:px-6">
				{title && title.kind === 'title' ? (
					<header className="space-y-3 border-b border-neutral-800 pb-6">
						<h1 className="text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
							{renderInline(title.text, inlineOptions)}
						</h1>
					</header>
				) : null}

				<div className="space-y-6">{blocks.map((block, index) => renderBlock(block, `block-${index}`))}</div>
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
