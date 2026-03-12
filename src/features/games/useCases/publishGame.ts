import type { PublishGameRequest } from '../domain/requests';
import type { GameAdminMission, GamePublishValidationError } from '../domain/types';
import type { PublishGameDeps } from '../ports';

export type PublishGameResult =
	| { ok: true; mission: GameAdminMission }
	| {
			ok: false;
			error:
				| 'not_found'
				| 'not_draft'
				| 'published_mission_exists'
				| 'settings_revision_conflict'
				| 'publish_validation_failed'
				| 'database_error';
			reasons?: GamePublishValidationError[];
	  };

export function publishGame(
	deps: PublishGameDeps,
	input: PublishGameRequest & { missionId: number; publishedBySteamId64: string }
): PublishGameResult {
	const result = deps.repo.publishMission(input);
	if (result.success) return { ok: true, mission: result.mission };
	return { ok: false, error: result.error, reasons: result.reasons };
}
