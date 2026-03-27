import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImportantPage } from '@/features/content/ui/root';

const importantFileByLocale: Record<string, string> = {
	ar: 'important.ar.md',
	en: 'important.en.md',
	ru: 'important.ru.md',
	uk: 'important.uk.md'
};

export default async function ImportantRoutePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const fileName = importantFileByLocale[locale] ?? importantFileByLocale.en;
	const content = await readFile(path.join(process.cwd(), 'content', 'important', fileName), 'utf8');

	return <ImportantPage content={content} />;
}
