import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Set<Listener>();
let currentTime: number | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

function emitCurrentTime() {
	currentTime = Date.now();
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: Listener) {
	listeners.add(listener);

	if (listeners.size === 1) {
		emitCurrentTime();
		intervalId = setInterval(emitCurrentTime, 1_000);
	} else if (currentTime === null) {
		emitCurrentTime();
	}

	return () => {
		listeners.delete(listener);
		if (listeners.size === 0 && intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};
}

function getSnapshot() {
	return currentTime;
}

function getServerSnapshot() {
	return null;
}

export function useCurrentTime(): number | null {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
