import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImportantPage } from '@/features/content/ui/root';

const guideFileByLocale: Record<string, string> = {
	ar: 'guide.ar.md',
	en: 'guide.en.md',
	ru: 'guide.ru.md',
	uk: 'guide.uk.md'
};

export default async function GuideRoutePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const fileName = guideFileByLocale[locale] ?? guideFileByLocale.en;
	const content = await readFile(path.join(process.cwd(), 'content', 'guide', fileName), 'utf8');

	return <ImportantPage content={content} />;
}
