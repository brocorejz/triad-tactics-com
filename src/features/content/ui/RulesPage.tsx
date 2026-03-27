"use client";

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type RuleItem =
	| { kind: 'rule'; marker: string; body: string; depth: number }
	| { kind: 'heading3'; text: string; id: string }
	| { kind: 'paragraph'; text: string };

type RuleSubsection = {
	id: string;
	title: string;
	items: RuleItem[];
};

type RuleSection = {
	id: string;
	title: string;
	subsections: RuleSubsection[];
};

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '') || 'section';
}

function splitTopLevelSections(content: string) {
	const lines = content.split(/\r?\n/);
	const sections: Array<{ title: string; lines: string[] }> = [];
	let current: { title: string; lines: string[] } | null = null;

	for (const line of lines) {
		if (line.startsWith('# ')) {
			if (current) sections.push(current);
			current = { title: line.slice(2).trim(), lines: [] };
			continue;
		}

		if (!current) continue;
		current.lines.push(line);
	}

	if (current) sections.push(current);

	return sections;
}

function parseRuleDepth(marker: string) {
	return Math.max(marker.split('.').filter(Boolean).length - 1, 0);
}

function getRuleIndent(depth: number) {
	return Math.max(depth - 1, 0) * 14;
}

function parseSubsections(lines: string[], sectionId: string): RuleSubsection[] {
	const subsections: RuleSubsection[] = [];
	let current: RuleSubsection | null = null;
	let headingIndex = 0;

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line || line === '---') continue;

		if (line.startsWith('## ')) {
			if (current) subsections.push(current);
			const title = line.slice(3).trim();
			current = {
				id: `${sectionId}-${slugify(title)}`,
				title,
				items: []
			};
			continue;
		}

		if (!current) continue;

		if (line.startsWith('### ')) {
			headingIndex += 1;
			const text = line.slice(4).trim();
			current.items.push({
				kind: 'heading3',
				text,
				id: `${current.id}-sub-${headingIndex}-${slugify(text)}`
			});
			continue;
		}

		const numberedMatch = line.match(/^(\d+(?:\.\d+)*)\.\s+(.*)$/);
		if (numberedMatch) {
			const [, marker, body] = numberedMatch;
			current.items.push({
				kind: 'rule',
				marker,
				body,
				depth: parseRuleDepth(marker)
			});
			continue;
		}

		current.items.push({ kind: 'paragraph', text: rawLine });
	}

	if (current) subsections.push(current);

	return subsections;
}

function parseSections(content: string): RuleSection[] {
	return splitTopLevelSections(content)
		.map((section) => {
			const id = slugify(section.title);
			return {
				id,
				title: section.title,
				subsections: parseSubsections(section.lines, id)
			};
		})
		.filter((section) => section.subsections.length > 0);
}

function findSectionIndexByAnchor(sections: RuleSection[], anchorId: string) {
	return sections.findIndex((section) => section.subsections.some((subsection) => subsection.id === anchorId));
}

function renderInline(text: string, options?: { linksAsText?: boolean }): ReactNode[] {
	return text.split(/(`[^`]+`|https?:\/\/\S+)/g).filter(Boolean).map((part, index) => {
		if (part.startsWith('`') && part.endsWith('`')) {
			return (
				<code key={`${part}-${index}`} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.95em] text-neutral-100">
					{part.slice(1, -1)}
				</code>
			);
		}

		if (/^https?:\/\//.test(part)) {
			if (options?.linksAsText) {
				return <span key={`${part}-${index}`}>{part}</span>;
			}

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

function splitMarkerAndText(text: string) {
	const match = text.match(/^(\d+(?:\.\d+)*)\.\s+(.*)$/);
	if (!match) return null;
	return { marker: match[1], body: match[2] };
}

function getMarkerClasses(depth: number) {
	if (depth === 0) {
		return 'text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl';
	}

	if (depth === 1) {
		return 'text-lg font-semibold tracking-tight text-neutral-50';
	}

	return 'text-sm font-semibold text-neutral-300';
}

function NumberMarker({ marker, depth }: { marker: string; depth: number }) {
	return <div className={`tabular-nums shrink-0 ${getMarkerClasses(depth)}`}>{marker}.</div>;
}

function NumberedLine({ marker, body, depth }: { marker: string; body: string; depth: number }) {
	const bodyClass =
		depth === 0
			? 'text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl'
			: depth === 1
				? 'text-lg font-semibold tracking-tight text-neutral-50'
				: 'text-sm leading-7 text-neutral-300 sm:text-base';

	return (
		<div className="flex items-baseline gap-3 py-1" style={{ marginInlineStart: `${getRuleIndent(depth)}px` }}>
			<NumberMarker marker={marker} depth={depth} />
			<div className={`min-w-0 ${bodyClass}`}>
				{renderInline(body)}
			</div>
		</div>
	);
}

function RuleRow({ marker, body, depth }: { marker: string; body: string; depth: number }) {
	const bodyClass = 'text-sm leading-7 text-neutral-300 sm:text-base';

	return (
		<div className="flex items-baseline gap-3 py-1.5" style={{ marginInlineStart: `${getRuleIndent(depth)}px` }}>
			<NumberMarker marker={marker} depth={depth} />
			<div className={`min-w-0 ${bodyClass}`}>
				{renderInline(body)}
			</div>
		</div>
	);
}

export default function RulesPage({ content }: { content: string }) {
	const t = useTranslations('rulesPage');
	const sections = useMemo(() => parseSections(content), [content]);
	const [rawActiveIndex, setActiveIndex] = useState(0);
	const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
	const [showBackToTop, setShowBackToTop] = useState(false);
	const activeIndex = Math.min(rawActiveIndex, Math.max(sections.length - 1, 0));
	const activeSection = sections[activeIndex] ?? sections[0] ?? null;

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const applyHash = () => {
			const anchorId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
			if (!anchorId) return;

			const sectionIndex = findSectionIndexByAnchor(sections, anchorId);
			if (sectionIndex >= 0) {
				setActiveIndex(sectionIndex);
				setPendingAnchor(anchorId);
				return;
			}

			const target = document.getElementById(anchorId);
			if (target) target.scrollIntoView({ block: 'start' });
		};

		applyHash();
		window.addEventListener('hashchange', applyHash);

		return () => window.removeEventListener('hashchange', applyHash);
	}, [sections]);

	useEffect(() => {
		if (!pendingAnchor || typeof window === 'undefined') return;

		const frame = window.requestAnimationFrame(() => {
			const target = document.getElementById(pendingAnchor);
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' });
				window.history.replaceState(null, '', `#${pendingAnchor}`);
			}
			setPendingAnchor(null);
		});

		return () => window.cancelAnimationFrame(frame);
	}, [pendingAnchor, activeIndex]);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleScroll = () => {
			setShowBackToTop(window.scrollY > 480);
		};

		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	if (!activeSection) return null;

	const handleSectionOpen = (index: number) => {
		if (typeof window !== 'undefined' && window.location.hash) {
			window.history.replaceState(null, '', window.location.pathname + window.location.search);
		}
		setPendingAnchor(null);
		setActiveIndex(index);
	};

	const handleAnchorClick = (sectionIndex: number, anchorId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		if (sectionIndex !== activeIndex) {
			setActiveIndex(sectionIndex);
		}
		setPendingAnchor(anchorId);
	};

	const handleBackToTop = () => {
		if (typeof window === 'undefined') return;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	return (
		<section className="text-sm text-neutral-200">
			<div className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-6 shadow-sm shadow-black/20 sm:px-6">
				{sections.length > 0 ? (
					<nav aria-label={t('sectionsAria')} className="space-y-3">
						<div className="flex flex-wrap gap-2">
							{sections.map((section, index) => {
								const active = index === activeIndex;

								return (
									<button
										key={section.id}
										type="button"
										onClick={() => handleSectionOpen(index)}
										className={
											'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 focus:ring-offset-neutral-950 ' +
											(active
												? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-neutral-950'
												: 'border-[color:var(--accent)]/45 bg-[color:var(--accent)]/8 text-neutral-50 hover:bg-[color:var(--accent)]/14')
										}
									>
										{renderInline(section.title, { linksAsText: true })}
										{!active ? <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--accent)]">{t('readThisToo')}</span> : null}
									</button>
								);
							})}
						</div>
						<p className="text-sm leading-6 text-neutral-400">{t('readBothBody')}</p>
					</nav>
				) : null}

				<div className="min-w-0 space-y-10">
					<header className="space-y-3 border-b border-neutral-800 pb-6">
						<h1 className="text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
							{renderInline(activeSection.title)}
						</h1>
						{activeSection.subsections.length > 0 ? (
							<div className="space-y-3 pt-2">
								<p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">{t('contentsEyebrow')}</p>
								<div className="flex flex-wrap gap-2">
									{activeSection.subsections.map((subsection) => (
										<a
											key={subsection.id}
											href={`#${subsection.id}`}
											onClick={handleAnchorClick(activeIndex, subsection.id)}
											className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-[color:var(--accent)]/40 hover:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 focus:ring-offset-neutral-950"
										>
											{renderInline(subsection.title)}
										</a>
									))}
								</div>
							</div>
						) : null}
					</header>

					{activeSection.subsections.map((subsection) => {
						const heading = splitMarkerAndText(subsection.title);

						return (
							<section key={subsection.id} id={subsection.id} className="scroll-mt-24 space-y-6 border-b border-neutral-900 pb-8 last:border-b-0 last:pb-0">
								{heading ? (
									<NumberedLine marker={heading.marker} body={heading.body} depth={parseRuleDepth(heading.marker)} />
								) : (
									<h2 className="text-2xl font-semibold tracking-tight text-neutral-100">
										{renderInline(subsection.title)}
									</h2>
								)}

								<div className="space-y-5">
									{subsection.items.map((item, index) => {
										if (item.kind === 'heading3') {
											const subheading = splitMarkerAndText(item.text);
											return (
												<div key={`${item.id}-${index}`} id={item.id} className="pt-3">
													{subheading ? (
														<NumberedLine marker={subheading.marker} body={subheading.body} depth={parseRuleDepth(subheading.marker)} />
													) : (
														<h3 className="text-lg font-semibold tracking-tight text-neutral-50">{renderInline(item.text)}</h3>
													)}
												</div>
											);
										}

										if (item.kind === 'paragraph') {
											return (
												<p key={`paragraph-${index}`} className="leading-7 text-neutral-300">
													{renderInline(item.text)}
												</p>
											);
										}

										return (
											<RuleRow
												key={`rule-${item.marker}-${index}`}
												marker={item.marker}
												body={item.body}
												depth={item.depth}
											/>
										);
									})}
								</div>
							</section>
						);
					})}

					{showBackToTop ? (
						<div className="sticky bottom-5 flex justify-end pt-2">
							<button
								type="button"
								onClick={handleBackToTop}
								className="inline-flex items-center gap-2 rounded-full border border-[color:var(--accent)]/45 bg-neutral-900/90 px-3 py-2 text-sm font-semibold text-neutral-50 shadow-lg shadow-black/20 backdrop-blur transition-colors hover:bg-[color:var(--accent)] hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 focus:ring-offset-neutral-950"
								aria-label={t('backToTop')}
							>
								<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
									<path
										fillRule="evenodd"
										d="M10.53 5.22a.75.75 0 0 0-1.06 0L5.22 9.47a.75.75 0 1 0 1.06 1.06l2.97-2.97v7.69a.75.75 0 0 0 1.5 0V7.56l2.97 2.97a.75.75 0 1 0 1.06-1.06l-4.25-4.25Z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{t('backToTop')}</span>
							</button>
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}
