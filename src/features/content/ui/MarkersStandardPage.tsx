type MarkerLocale = 'ar' | 'en' | 'ru' | 'uk';

type MarkerItem = {
	spriteX: number;
	spriteY: number;
	texts: Record<MarkerLocale, string[]>;
};

type MarkerColumn = {
	id: string;
	titles: Record<MarkerLocale, string[]>;
	headerClass: string;
	items: MarkerItem[];
};

const spriteWidth = 46;
const spriteHeight = 44;

const columns: MarkerColumn[] = [
	{
		id: 'ally',
		titles: {
			ar: ['حليف'],
			en: ['Ally'],
			ru: ['Союзник'],
			uk: ['Союзник']
		},
		headerClass: 'border-red-500/40 bg-red-600/35',
		items: [
			{
				spriteX: 8,
				spriteY: 55,
				texts: {
					ar: ['موقع', 'وحدة حليفة'],
					en: ['Position of an', 'allied unit'],
					ru: ['Указание на', 'союзную позицию'],
					uk: ['Позначення', 'союзної позиції']
				}
			},
			{
				spriteX: 8,
				spriteY: 105,
				texts: {
					ar: ['فصيلة مشاة', 'حليفة'],
					en: ['Allied infantry', 'squad'],
					ru: ['Союзное пехотное', 'отделение'],
					uk: ['Союзне піхотне', 'відділення']
				}
			},
			{
				spriteX: 8,
				spriteY: 156,
				texts: {
					ar: ['آلية', 'حليفة'],
					en: ['Allied vehicle'],
					ru: ['Союзная техника'],
					uk: ['Союзна техніка']
				}
			},
			{
				spriteX: 8,
				spriteY: 207,
				texts: {
					ar: ['جندي مشاة', 'حليف'],
					en: ['Allied infantryman'],
					ru: ['Союзный пехотинец'],
					uk: ['Союзний піхотинець']
				}
			},
			{
				spriteX: 8,
				spriteY: 258,
				texts: {
					ar: ['إنزال', 'حليف'],
					en: ['Allied landing'],
					ru: ['Высадка союзников'],
					uk: ['Висадка союзників']
				}
			},
			{
				spriteX: 8,
				spriteY: 309,
				texts: {
					ar: ['مقر', 'حليف'],
					en: ['Allied HQ'],
					ru: ['Союзный штаб'],
					uk: ['Союзний штаб']
				}
			},
			{
				spriteX: 8,
				spriteY: 360,
				texts: {
					ar: ['ألغام', 'حليفة'],
					en: ['Allied mines'],
					ru: ['Союзные мины'],
					uk: ['Союзні міни']
				}
			},
			{
				spriteX: 8,
				spriteY: 411,
				texts: {
					ar: ['انتباه،', 'حليف'],
					en: ['Warning, ally'],
					ru: ['Внимание, союзник'],
					uk: ['Увага, союзник']
				}
			},
			{
				spriteX: 8,
				spriteY: 462,
				texts: {
					ar: ['طلب معلومات عن', 'وجود الحلفاء'],
					en: ['Request info about', 'allies present'],
					ru: ['Запрос информации', 'о наличии союзников'],
					uk: ['Запит інформації', 'про наявність союзників']
				}
			}
		]
	},
	{
		id: 'enemy',
		titles: {
			ar: ['عدو'],
			en: ['Enemy'],
			ru: ['Противник'],
			uk: ['Противник']
		},
		headerClass: 'border-sky-500/40 bg-sky-600/35',
		items: [
			{
				spriteX: 343,
				spriteY: 55,
				texts: {
					ar: ['موقع', 'وحدة معادية'],
					en: ['Position of an', 'enemy unit'],
					ru: ['Указание на', 'вражескую позицию'],
					uk: ['Позначення', 'ворожої позиції']
				}
			},
			{
				spriteX: 343,
				spriteY: 105,
				texts: {
					ar: ['فصيلة مشاة', 'معادية'],
					en: ['Enemy infantry', 'squad'],
					ru: ['Вражеское пехотное', 'отделение'],
					uk: ['Вороже піхотне', 'відділення']
				}
			},
			{
				spriteX: 343,
				spriteY: 156,
				texts: {
					ar: ['آلية', 'معادية'],
					en: ['Enemy vehicle'],
					ru: ['Вражеская техника'],
					uk: ['Ворожа техніка']
				}
			},
			{
				spriteX: 343,
				spriteY: 207,
				texts: {
					ar: ['جندي مشاة', 'معادٍ'],
					en: ['Enemy infantryman'],
					ru: ['Вражеский пехотинец'],
					uk: ['Ворожий піхотинець']
				}
			},
			{
				spriteX: 343,
				spriteY: 258,
				texts: {
					ar: ['إنزال', 'معادٍ'],
					en: ['Enemy landing'],
					ru: ['Высадка противников'],
					uk: ['Висадка противника']
				}
			},
			{
				spriteX: 343,
				spriteY: 309,
				texts: {
					ar: ['مقر', 'معادٍ'],
					en: ['Enemy HQ'],
					ru: ['Вражеский штаб'],
					uk: ['Ворожий штаб']
				}
			},
			{
				spriteX: 343,
				spriteY: 360,
				texts: {
					ar: ['ألغام', 'معادية'],
					en: ['Enemy mines'],
					ru: ['Вражеские мины'],
					uk: ['Ворожі міни']
				}
			},
			{
				spriteX: 343,
				spriteY: 411,
				texts: {
					ar: ['انتباه،', 'عدو'],
					en: ['Warning, enemy'],
					ru: ['Внимание, противник'],
					uk: ['Увага, противник']
				}
			},
			{
				spriteX: 343,
				spriteY: 462,
				texts: {
					ar: ['طلب معلومات عن', 'وجود العدو'],
					en: ['Request info about', 'enemies present'],
					ru: ['Запрос информации', 'о наличии противников'],
					uk: ['Запит інформації', 'про наявність противника']
				}
			}
		]
	},
	{
		id: 'route',
		titles: {
			ar: ['عنصر مسار /', 'مهمة'],
			en: ['Route element / Task'],
			ru: ['Элемент маршрута / задача'],
			uk: ['Елемент маршруту /', 'завдання']
		},
		headerClass: 'border-emerald-500/40 bg-emerald-600/35',
		items: [
			{
				spriteX: 676,
				spriteY: 55,
				texts: {
					ar: ['موقع /', 'نقطة اهتمام'],
					en: ['Position /', 'point of interest'],
					ru: ['Указание на позицию /', 'точку интереса'],
					uk: ['Позначення позиції /', 'точки інтересу']
				}
			},
			{
				spriteX: 676,
				spriteY: 105,
				texts: {
					ar: ['نقطة مسار لفصيلة', 'مشاة حليفة'],
					en: ['Waypoint for allied', 'infantry squad'],
					ru: ['Маршрутная точка союзного', 'пехотного отделения'],
					uk: ['Маршрутна точка союзного', 'піхотного відділення']
				}
			},
			{
				spriteX: 676,
				spriteY: 156,
				texts: {
					ar: ['نقطة مسار', 'لآلية حليفة'],
					en: ['Waypoint for allied', 'vehicle'],
					ru: ['Маршрутная точка союзной', 'техники'],
					uk: ['Маршрутна точка союзної', 'техніки']
				}
			},
			{
				spriteX: 676,
				spriteY: 207,
				texts: {
					ar: ['نقطة مسار', 'لمشاة حليف'],
					en: ['Waypoint for allied', 'infantryman'],
					ru: ['Маршрутная точка союзного', 'пехотинца'],
					uk: ['Маршрутна точка союзного', 'піхотинця']
				}
			},
			{
				spriteX: 676,
				spriteY: 258,
				texts: {
					ar: ['إنزال', 'مخطط'],
					en: ['Planned landing'],
					ru: ['Планируемая высадка'],
					uk: ['Запланована висадка']
				}
			},
			{
				spriteX: 676,
				spriteY: 309,
				texts: {
					ar: ['موقع مقر مخطط /', 'هدف وسيط'],
					en: ['Planned HQ position /', 'intermediate objective'],
					ru: ['Планируемая позиция штаба /', 'промежуточная цель'],
					uk: ['Запланована позиція штабу /', 'проміжна ціль']
				}
			},
			{
				spriteX: 676,
				spriteY: 360,
				texts: {
					ar: ['مهمة', 'تلغيم'],
					en: ['Mining task'],
					ru: ['Задача на минирование'],
					uk: ['Завдання на мінування']
				}
			},
			{
				spriteX: 676,
				spriteY: 411,
				texts: {
					ar: ['تحذير عند', 'الموقع'],
					en: ['Warning at position'],
					ru: ['Внимание на позицию'],
					uk: ['Увага на позиції']
				}
			},
			{
				spriteX: 676,
				spriteY: 462,
				texts: {
					ar: ['طلب معلومات عن', 'نقطة اهتمام'],
					en: ['Request info about', 'point of interest'],
					ru: ['Запрос информации', 'о точке интереса'],
					uk: ['Запит інформації', 'про точку інтересу']
				}
			},
			{
				spriteX: 676,
				spriteY: 513,
				texts: {
					ar: ['هدف', 'مدفعية'],
					en: ['Artillery target'],
					ru: ['Цель для артиллерии'],
					uk: ['Ціль для артилерії']
				}
			}
		]
	},
	{
		id: 'warning',
		titles: {
			ar: ['تحذير /', 'مدمّر'],
			en: ['Warning / Destroyed'],
			ru: ['Внимание / Уничтожено'],
			uk: ['Увага /', 'Знищено']
		},
		headerClass: 'border-amber-400/40 bg-amber-500/35',
		items: [
			{
				spriteX: 1010,
				spriteY: 55,
				texts: {
					ar: ['عنصر', 'مدمّر'],
					en: ['Destroyed object'],
					ru: ['Уничтоженный объект'],
					uk: ['Знищений обʼєкт']
				}
			},
			{
				spriteX: 1010,
				spriteY: 105,
				texts: {
					ar: ['فصيلة', 'مدمّرة'],
					en: ['Destroyed squad'],
					ru: ['Уничтоженное отделение'],
					uk: ['Знищене відділення']
				}
			},
			{
				spriteX: 1010,
				spriteY: 156,
				texts: {
					ar: ['آلية', 'مدمّرة'],
					en: ['Destroyed vehicle'],
					ru: ['Уничтоженная техника'],
					uk: ['Знищена техніка']
				}
			},
			{
				spriteX: 1010,
				spriteY: 207,
				texts: {
					ar: ['جندي مشاة', 'قتيل'],
					en: ['Dead infantryman'],
					ru: ['Мертвый пехотинец'],
					uk: ['Мертвий піхотинець']
				}
			},
			{
				spriteX: 1010,
				spriteY: 360,
				texts: {
					ar: ['عنصر', 'منزوع الألغام'],
					en: ['Cleared object'],
					ru: ['Разминированный объект'],
					uk: ['Розмінований обʼєкт']
				}
			},
			{
				spriteX: 1010,
				spriteY: 411,
				texts: {
					ar: ['تحذير'],
					en: ['Warning'],
					ru: ['Внимание'],
					uk: ['Увага']
				}
			},
			{
				spriteX: 1010,
				spriteY: 462,
				texts: {
					ar: ['طلب معلومات', 'عام'],
					en: ['General info request'],
					ru: ['Общий запрос информации'],
					uk: ['Загальний запит', 'інформації']
				}
			}
		]
	}
];

function parseMarkdown(content: string) {
	const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const titleLine = lines.find((line) => line.startsWith('# '));
	const paragraphs = lines.filter((line) => !line.startsWith('# '));

	return {
		title: titleLine ? titleLine.slice(2).trim() : '',
		intro: paragraphs[0] ?? ''
	};
}

export default function MarkersStandardPage({
	content,
	textLocale
}: {
	content: string;
	textLocale: MarkerLocale;
}) {
	const { title, intro } = parseMarkdown(content);

	const renderLines = (lines: string[]) =>
		lines.map((line, index) => (
			<span key={`line-${index}`} className="block">
				{line}
			</span>
		));

	return (
		<section className="text-sm text-neutral-200">
			<div className="space-y-8 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-6 shadow-sm shadow-black/20 sm:px-6">
				<header className="space-y-3 border-b border-neutral-800 pb-6">
					<h1 className="text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">{title}</h1>
					{intro ? <p className="max-w-3xl leading-7 text-neutral-300">{intro}</p> : null}
				</header>

				<div className="grid gap-4 xl:grid-cols-2">
					{columns.map((column) => {
						const titleLines = column.titles[textLocale];
						return (
							<section
								key={column.id}
								className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]"
							>
								<header className={`border-b px-4 py-3 ${column.headerClass}`}>
									<h2 className="text-lg font-semibold tracking-tight text-neutral-50">{renderLines(titleLines)}</h2>
								</header>
								<div className="divide-y divide-white/6">
									{column.items.map((item, index) => {
										const lines = item.texts[textLocale];
										return (
											<div key={`${column.id}-${index}`} className="flex items-center gap-4 px-4 py-3">
												<div
													className="shrink-0 overflow-hidden rounded-md ring-1 ring-black/20"
													style={{
														width: `${spriteWidth}px`,
														height: `${spriteHeight}px`,
														backgroundImage: "url('/markers/markers.png')",
														backgroundRepeat: 'no-repeat',
														backgroundSize: '1335px 562px',
														backgroundPosition: `-${item.spriteX}px -${item.spriteY}px`
													}}
												/>
												<div className="min-w-0 text-base leading-6 text-neutral-100">{renderLines(lines)}</div>
											</div>
										);
									})}
								</div>
							</section>
						);
					})}
				</div>
			</div>
		</section>
	);
}
