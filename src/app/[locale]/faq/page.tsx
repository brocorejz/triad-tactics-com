import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImportantPage } from '@/features/content/ui/root';

const faqFileByLocale: Record<string, string> = {
	ar: 'faq.ar.md',
	en: 'faq.en.md',
	ru: 'faq.ru.md',
	uk: 'faq.uk.md'
};

export default async function FaqRoutePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const fileName = faqFileByLocale[locale] ?? faqFileByLocale.en;
	const content = await readFile(path.join(process.cwd(), 'content', 'faq', fileName), 'utf8');

	return <ImportantPage content={content} />;
}
