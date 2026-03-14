import { useSyncExternalStore } from 'react';
import { getViewerDateTimePreferences, type ViewerDateTimePreferences } from './dateTime';

const emptyPreferences: ViewerDateTimePreferences = {
	timeZone: null,
	hourCycle: null
};

let cachedClientPreferences: ViewerDateTimePreferences | null = null;

function getClientSnapshot(): ViewerDateTimePreferences {
	if (!cachedClientPreferences) {
		cachedClientPreferences = getViewerDateTimePreferences();
	}

	return cachedClientPreferences;
}

function subscribe(onStoreChange: () => void) {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const handlePotentialChange = () => {
		const nextPreferences = getViewerDateTimePreferences();
		if (
			nextPreferences.timeZone !== cachedClientPreferences?.timeZone ||
			nextPreferences.hourCycle !== cachedClientPreferences?.hourCycle
		) {
			cachedClientPreferences = nextPreferences;
			onStoreChange();
		}
	};

	handlePotentialChange();

	window.addEventListener('focus', handlePotentialChange);
	document.addEventListener('visibilitychange', handlePotentialChange);

	return () => {
		window.removeEventListener('focus', handlePotentialChange);
		document.removeEventListener('visibilitychange', handlePotentialChange);
	};
}

export function useViewerDateTimePreferences(): ViewerDateTimePreferences {
	return useSyncExternalStore(subscribe, getClientSnapshot, () => emptyPreferences);
}
