import type { GameDraftCreateMode, GameAdminMission } from '../domain/types';
import type { CreateGameDraftDeps } from '../ports';

export type CreateGameDraftResult =
	| { ok: true; mission: GameAdminMission }
	| { ok: false; error: 'draft_exists' | 'no_source_mission' | 'database_error' };

export function createGameDraft(
	deps: CreateGameDraftDeps,
	input: { mode: GameDraftCreateMode; createdBySteamId64: string }
): CreateGameDraftResult {
	const result = deps.repo.createDraft(input);
	if (result.success) return { ok: true, mission: result.mission };
	return { ok: false, error: result.error };
}
