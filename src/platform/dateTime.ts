export type ViewerHourCycle = Intl.ResolvedDateTimeFormatOptions['hourCycle'];

export type ViewerDateTimePreferences = {
	timeZone: string | null;
	hourCycle: ViewerHourCycle | null;
};

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const explicitOffsetPattern = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

function normalizeDateTimeValue(value: string): string {
	const trimmed = value.trim();
	if (dateOnlyPattern.test(trimmed)) {
		return `${trimmed}T00:00:00Z`;
	}

	if (trimmed.includes(' ')) {
		const normalized = trimmed.replace(' ', 'T');
		return explicitOffsetPattern.test(normalized) ? normalized : `${normalized}Z`;
	}

	if (trimmed.includes('T')) {
		return explicitOffsetPattern.test(trimmed) ? trimmed : `${trimmed}Z`;
	}

	return trimmed;
}

export function getViewerDateTimePreferences(): ViewerDateTimePreferences {
	if (typeof window === 'undefined') {
		return { timeZone: null, hourCycle: null };
	}

	const { timeZone, hourCycle } = Intl.DateTimeFormat().resolvedOptions();
	return {
		timeZone: timeZone || 'UTC',
		hourCycle: hourCycle ?? null
	};
}

export function parseDateTimeValue(value: string): Date | null {
	const date = new Date(normalizeDateTimeValue(value));
	return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalizedDateTime(
	value: string | null,
	options: {
		locale: string;
		timeZone: string | null;
		hourCycle?: ViewerHourCycle | null;
		dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
		timeStyle?: Intl.DateTimeFormatOptions['timeStyle'];
	}
): string | null {
	const { locale, timeZone, hourCycle, dateStyle = 'medium', timeStyle = 'short' } = options;
	if (!value || !timeZone) return null;

	const date = parseDateTimeValue(value);
	if (!date) return null;

	const formatOptions: Intl.DateTimeFormatOptions = {
		dateStyle,
		timeStyle,
		timeZone
	};

	if (hourCycle) {
		formatOptions.hourCycle = hourCycle;
	}

	try {
		return new Intl.DateTimeFormat(locale, formatOptions).format(date);
	} catch {
		return null;
	}
}

export function formatLocalizedDate(
	value: string | Date | null,
	options: {
		locale: string;
		timeZone?: string;
		dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
	}
): string | null {
	const { locale, timeZone = 'UTC', dateStyle = 'long' } = options;
	if (!value) return null;

	const date = typeof value === 'string' ? parseDateTimeValue(value) : value;
	if (!date || Number.isNaN(date.getTime())) return null;

	try {
		return new Intl.DateTimeFormat(locale, {
			dateStyle,
			timeZone
		}).format(date);
	} catch {
		return null;
	}
}

export function formatTimeZoneDisplay(timeZone: string | null): string | null {
	return timeZone ? timeZone.replace(/\//g, ' / ') : null;
}
