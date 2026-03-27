import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { RulesPage } from '@/features/content/ui/root';

const rulesFileByLocale: Record<string, string> = {
	ar: 'rules.ar.md',
	en: 'rules.en.md',
	ru: 'rules.ru.md',
	uk: 'rules.uk.md'
};

export default async function RulesRoutePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const fileName = rulesFileByLocale[locale] ?? rulesFileByLocale.en;
	let content: string;

	try {
		content = await readFile(path.join(process.cwd(), 'content', 'rules', fileName), 'utf8');
	} catch (error) {
		if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
			notFound();
		}

		throw error;
	}

	return <RulesPage content={content} />;
}
