import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MarkersStandardPage } from '@/features/content/ui/root';

const markersStandardFileByLocale: Record<string, string> = {
	ar: 'markers-standard.ar.md',
	en: 'markers-standard.en.md',
	ru: 'markers-standard.ru.md',
	uk: 'markers-standard.uk.md'
};

export default async function MarkersStandardRoutePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const fileName = markersStandardFileByLocale[locale] ?? markersStandardFileByLocale.en;
	const content = await readFile(path.join(process.cwd(), 'content', 'markers-standard', fileName), 'utf8');

	return (
		<MarkersStandardPage
			content={content}
			textLocale={locale === 'ar' || locale === 'en' || locale === 'ru' || locale === 'uk' ? locale : 'en'}
		/>
	);
}
