import {
	clearUserOccupants,
	detectDestructiveSlottingChanges,
	emptyCanonicalSlotting,
	hasPrioritySlots,
	hasRegularSlots,
	normalizeLegacySlotting,
	parseCanonicalSlotting
} from '@/features/games/domain/slotting';
import type {
	DeleteArchivedMissionRequest,
	ImportGameSlottingRequest,
	PublishGameRequest,
	UpdateGameSettingsRequest,
	UpdateGameSlottingRequest
} from '@/features/games/domain/requests';
import type {
	AdminGamesOverview,
	CurrentGameSummary,
	GameAdminMission,
	GameArchiveSummary,
	GameAuditEvent,
	GameArchiveStatus,
	GameArchiveResult,
	GameMissionDetail,
	GameMissionPassword,
	GamePriorityClaimManualState,
	GameRegularJoinParticipant,
	GamePublishValidationError,
	LocalizedDescription
} from '@/features/games/domain/types';
import { appLocales } from '@/i18n/locales';
import type {
	GetMissionAuditRepoResult,
	ClaimPrioritySlotRepoResult,
	CreateGameDraftRepoResult,
	DeleteArchivedMissionRepoResult,
	DeleteCurrentDraftRepoResult,
	GetAdminGameMissionRepoResult,
	GetGameArchiveSummariesRepoResult,
	GetGameByShortCodeRepoResult,
	HidePriorityGameplayRepoResult,
	HideRegularGameplayRepoResult,
	ImportGameSlottingRepoResult,
	JoinRegularGameRepoResult,
	LeavePrioritySlotRepoResult,
	LeaveRegularGameRepoResult,
	PublishGameRepoResult,
	ReleasePriorityGameplayRepoResult,
	ReleaseRegularGameplayRepoResult,
	SwitchPrioritySlotRepoResult,
	UpdateGameSlottingRepoResult,
	UpdateGameSettingsRepoResult
} from '@/features/games/ports';
import { getDb } from '@/platform/db/connection';

type DbConnection = ReturnType<typeof getDb>;

type MissionRow = {
	id: number;
	short_code: string | null;
	status: 'draft' | 'published' | 'archived';
	title: string;
	description: string;
	starts_at: string | null;
	server_name: string;
	server_host: string;
	server_port: number | null;
	early_password: string | null;
	final_password: string | null;
	server_details_hidden: number | boolean;
	priority_claim_opens_at: string | null;
	priority_claim_manual_state: GamePriorityClaimManualState;
	regular_join_enabled: number | boolean;
	priority_gameplay_released_at: string | null;
	regular_gameplay_released_at: string | null;
	published_at: string | null;
	archived_at: string | null;
	archive_status: GameArchiveStatus | null;
	archive_reason: string | null;
	archive_result_json: string | null;
	created_at: string;
	updated_at: string;
	created_by_steamid64: string | null;
	updated_by_steamid64: string | null;
	published_by_steamid64: string | null;
	archived_by_steamid64: string | null;
	slotting_revision: number;
	settings_revision: number;
	slotting_json: string;
};

type MissionParticipationUserRow = {
	id: number;
	current_callsign: string | null;
};

type MissionAuditRow = {
	id: number;
	event_type: string;
	created_at: string;
	actor_user_id: number | null;
	actor_steamid64: string | null;
	actor_callsign: string | null;
	payload: string;
};

function isNonEmptyText(value: string | null | undefined): boolean {
	return typeof value === 'string' && value.trim() !== '';
}

const emptyLocalizedDescription: LocalizedDescription = Object.fromEntries(
	appLocales.map((locale) => [locale, ''])
) as LocalizedDescription;

function parseLocalizedDescription(raw: string): LocalizedDescription {
	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return Object.fromEntries(
				appLocales.map((locale) => [locale, typeof parsed[locale] === 'string' ? parsed[locale] : ''])
			) as LocalizedDescription;
		}
	} catch {}
	return { ...emptyLocalizedDescription, en: raw };
}

function selectPriorityBadgeTypeIds(db: DbConnection, missionId: number): number[] {
	const rows = db
		.prepare(`
			SELECT badge_type_id
			FROM mission_priority_badges
			WHERE mission_id = ?
			ORDER BY badge_type_id ASC
		`)
		.all(missionId) as Array<{ badge_type_id: number }>;

	return rows.map((row) => row.badge_type_id);
}

function mapMissionSettingsAudit(row: MissionRow, priorityBadgeTypeIds: number[]) {
	return {
		shortCode: row.short_code ?? null,
		title: row.title,
		description: parseLocalizedDescription(row.description),
		startsAt: row.starts_at ?? null,
		serverName: row.server_name,
		serverHost: row.server_host,
		serverPort: row.server_port ?? null,
		priorityClaimOpensAt: row.priority_claim_opens_at ?? null,
		priorityClaimManualState: row.priority_claim_manual_state,
		regularJoinEnabled: !!row.regular_join_enabled,
		serverDetailsHidden: !!row.server_details_hidden,
		earlyPassword: row.early_password ?? null,
		finalPassword: row.final_password ?? null,
		priorityBadgeTypeIds
	};
}

function parseStoredArchiveResult(raw: string | null): GameArchiveResult | null {
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as Record<string, unknown> | null;
		if (!parsed || (parsed.outcome !== 'winner' && parsed.outcome !== 'draw')) {
			return null;
		}
		const rawScores = Array.isArray(parsed.sideScores) ? parsed.sideScores as Record<string, unknown>[] : [];
		const sideScores = rawScores
			.filter(
				(score): score is Record<string, unknown> & { sideId: string; score: number } =>
					typeof score?.sideId === 'string' &&
					typeof score?.score === 'number' &&
					Number.isInteger(score.score) &&
					score.score >= 0
			)
			.map((score) => ({
				sideId: score.sideId,
				sideName: typeof score.sideName === 'string' ? score.sideName : score.sideId,
				score: score.score
			}));
		const winnerSideId = typeof parsed.winnerSideId === 'string' ? parsed.winnerSideId : null;
		return {
			outcome: parsed.outcome,
			winnerSideId: parsed.outcome === 'winner' ? winnerSideId : null,
			sideScores
		};
	} catch {
		return null;
	}
}

function parseAuditPayload(raw: string): GameAuditEvent['payload'] {
	try {
		return JSON.parse(raw) as GameAuditEvent['payload'];
	} catch {
		return raw;
	}
}

function mapArchiveSummaryRow(row: MissionRow): GameArchiveSummary | null {
	if (!row.short_code || !row.archive_status) {
		return null;
	}

	return {
		shortCode: row.short_code,
		title: row.title,
		description: parseLocalizedDescription(row.description),
		startsAt: row.starts_at ?? null,
		archivedAt: row.archived_at ?? row.updated_at,
		archiveStatus: row.archive_status,
		archiveReason: row.archive_reason ?? null,
		archiveResult: parseStoredArchiveResult(row.archive_result_json ?? null)
	};
}

function mapMissionRow(db: DbConnection, row: MissionRow): GameAdminMission {
	return {
		id: row.id,
		shortCode: row.short_code ?? null,
		status: row.status,
		title: row.title,
		description: parseLocalizedDescription(row.description),
		startsAt: row.starts_at ?? null,
		serverName: row.server_name,
		serverHost: row.server_host,
		serverPort: row.server_port ?? null,
		priorityClaimOpensAt: row.priority_claim_opens_at ?? null,
		priorityClaimManualState: row.priority_claim_manual_state,
		regularJoinEnabled: !!row.regular_join_enabled,
		priorityGameplayReleasedAt: row.priority_gameplay_released_at ?? null,
		regularGameplayReleasedAt: row.regular_gameplay_released_at ?? null,
		publishedAt: row.published_at ?? null,
		archivedAt: row.archived_at ?? null,
		archiveStatus: row.archive_status ?? null,
		archiveReason: row.archive_reason ?? null,
		archiveResult: parseStoredArchiveResult(row.archive_result_json ?? null),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		createdBySteamId64: row.created_by_steamid64 ?? null,
		updatedBySteamId64: row.updated_by_steamid64 ?? null,
		publishedBySteamId64: row.published_by_steamid64 ?? null,
		archivedBySteamId64: row.archived_by_steamid64 ?? null,
		slottingRevision: row.slotting_revision,
		settingsRevision: row.settings_revision,
		earlyPassword: row.early_password ?? null,
		finalPassword: row.final_password ?? null,
		serverDetailsHidden: !!row.server_details_hidden,
		priorityBadgeTypeIds: selectPriorityBadgeTypeIds(db, row.id),
		slotting: parseCanonicalSlotting(row.slotting_json)
	};
}

function selectMissionColumns() {
	return `
		id,
		short_code,
		status,
		title,
		description,
		starts_at,
		server_name,
		server_host,
		server_port,
		early_password,
		final_password,
		server_details_hidden,
		priority_claim_opens_at,
		priority_claim_manual_state,
		regular_join_enabled,
		priority_gameplay_released_at,
		regular_gameplay_released_at,
		published_at,
		archived_at,
		archive_status,
		archive_reason,
		archive_result_json,
		created_at,
		updated_at,
		created_by_steamid64,
		updated_by_steamid64,
		published_by_steamid64,
		archived_by_steamid64,
		slotting_revision,
		settings_revision,
		slotting_json
	`;
}

function isPriorityClaimOpen(row: MissionRow): boolean {
	if (row.priority_gameplay_released_at) return false;
	if (row.priority_claim_manual_state === 'open') return true;
	if (row.priority_claim_manual_state === 'closed') return false;
	if (!row.priority_claim_opens_at) return false;
	return new Date(row.priority_claim_opens_at).getTime() <= Date.now();
}

function isRegularJoinOpen(row: MissionRow, slotting: ReturnType<typeof parseCanonicalSlotting>): boolean {
	if (!row.regular_join_enabled) return false;
	if (row.priority_gameplay_released_at) return false;
	if (row.regular_gameplay_released_at) return false;
	return hasRegularSlots(slotting);
}

function findUserHeldSlot(slotting: ReturnType<typeof parseCanonicalSlotting>, userId: number) {
	for (const side of slotting.sides) {
		for (const squad of side.squads) {
			for (const slot of squad.slots) {
				if (slot.occupant?.type === 'user' && slot.occupant.userId === userId) {
					return { side, squad, slot };
				}
			}
		}
	}

	return null;
}

function findSlotById(slotting: ReturnType<typeof parseCanonicalSlotting>, slotId: string) {
	for (const side of slotting.sides) {
		for (const squad of side.squads) {
			for (const slot of squad.slots) {
				if (slot.id === slotId) {
					return { side, squad, slot };
				}
			}
		}
	}

	return null;
}

function countAvailablePrioritySlots(slotting: ReturnType<typeof parseCanonicalSlotting>): number {
	let count = 0;

	for (const side of slotting.sides) {
		for (const squad of side.squads) {
			for (const slot of squad.slots) {
				if (slot.access === 'priority' && slot.occupant === null) {
					count += 1;
				}
			}
		}
	}

	return count;
}

function assignUserToPrioritySlot(
	slotting: ReturnType<typeof parseCanonicalSlotting>,
	input: { slotId: string; userId: number; callsign: string }
): ReturnType<typeof parseCanonicalSlotting> {
	return {
		sides: slotting.sides.map((side) => ({
			...side,
			squads: side.squads.map((squad) => ({
				...squad,
				slots: squad.slots.map((slot) => {
					if (slot.id !== input.slotId) return slot;
					return {
						...slot,
						occupant: {
							type: 'user',
							userId: input.userId,
							callsign: input.callsign,
							assignedBy: 'self',
							assignedAt: new Date().toISOString()
						}
					};
				})
			}))
		}))
	};
}

function switchUserPrioritySlot(
	slotting: ReturnType<typeof parseCanonicalSlotting>,
	input: { fromSlotId: string; toSlotId: string; userId: number; callsign: string }
): ReturnType<typeof parseCanonicalSlotting> {
	const assignedAt = new Date().toISOString();

	return {
		sides: slotting.sides.map((side) => ({
			...side,
			squads: side.squads.map((squad) => ({
				...squad,
				slots: squad.slots.map((slot) => {
					if (slot.id === input.fromSlotId) {
						return { ...slot, occupant: null };
					}
					if (slot.id === input.toSlotId) {
						return {
							...slot,
							occupant: {
								type: 'user',
								userId: input.userId,
								callsign: input.callsign,
								assignedBy: 'self',
								assignedAt
							}
						};
					}
					return slot;
				})
			}))
		}))
	};
}

function releaseUserPrioritySlot(
	slotting: ReturnType<typeof parseCanonicalSlotting>,
	input: { slotId: string; userId: number }
): ReturnType<typeof parseCanonicalSlotting> {
	return {
		sides: slotting.sides.map((side) => ({
			...side,
			squads: side.squads.map((squad) => ({
				...squad,
				slots: squad.slots.map((slot) => {
					if (slot.id !== input.slotId) return slot;
					if (slot.access !== 'priority') return slot;
					if (slot.occupant?.type !== 'user' || slot.occupant.userId !== input.userId) return slot;
					return { ...slot, occupant: null };
				})
			}))
		}))
	};
}

function getMissionParticipationUser(db: DbConnection, steamId64: string): MissionParticipationUserRow | null {
	const row = db
		.prepare(`
			SELECT u.id, u.current_callsign
			FROM user_identities ui
			JOIN users u ON u.id = ui.user_id
			WHERE ui.provider = 'steam' AND ui.provider_user_id = ?
			LIMIT 1
		`)
		.get(steamId64) as MissionParticipationUserRow | undefined;

	return row ?? null;
}

function userHasMissionPriorityBadge(db: DbConnection, missionId: number, userId: number): boolean {
	const row = db
		.prepare(`
			SELECT 1
			FROM user_badges ub
			JOIN mission_priority_badges mpb
				ON mpb.badge_type_id = ub.badge_type_id
			WHERE ub.user_id = ? AND mpb.mission_id = ?
			LIMIT 1
		`)
		.get(userId, missionId) as { 1?: number } | undefined;

	return !!row;
}

function selectUserMissionPriorityBadgeLabels(db: DbConnection, missionId: number, userId: number): string[] {
	const rows = db
		.prepare(`
			SELECT DISTINCT bt.label
			FROM user_badges ub
			JOIN mission_priority_badges mpb
				ON mpb.badge_type_id = ub.badge_type_id
			JOIN badge_types bt
				ON bt.id = ub.badge_type_id
			WHERE ub.user_id = ? AND mpb.mission_id = ?
			ORDER BY bt.label COLLATE NOCASE ASC
		`)
		.all(userId, missionId) as Array<{ label: string | null }>;

	return rows
		.map((row) => row.label?.trim() ?? '')
		.filter((label) => label.length > 0);
}

function selectMissionRegularJoiners(db: DbConnection, missionId: number): GameRegularJoinParticipant[] {
	const rows = db
		.prepare(`
			SELECT mrj.user_id, mrj.joined_at,
				COALESCE(u.current_callsign, 'Steam_' || ui.provider_user_id) AS callsign
			FROM mission_regular_joins mrj
			JOIN users u ON u.id = mrj.user_id
			LEFT JOIN user_identities ui
				ON ui.user_id = u.id AND ui.provider = 'steam'
			WHERE mrj.mission_id = ?
			ORDER BY mrj.joined_at ASC, mrj.user_id ASC
		`)
		.all(missionId) as Array<{ user_id: number; joined_at: string; callsign: string | null }>;

	return rows.map((row) => ({
		userId: row.user_id,
		callsign: row.callsign?.trim() || `Steam_${row.user_id}`,
		joinedAt: row.joined_at
	}));
}

function userHasMissionRegularGameplayAccess(db: DbConnection, missionId: number, userId: number): boolean {
	const row = db
		.prepare(`
			SELECT 1
			FROM mission_regular_release_snapshot mrrs
			JOIN mission_regular_joins mrj
				ON mrj.mission_id = mrrs.mission_id
				AND mrj.user_id = mrrs.user_id
			WHERE mrrs.mission_id = ? AND mrrs.user_id = ?
			LIMIT 1
		`)
		.get(missionId, userId) as { 1?: number } | undefined;

	return !!row;
}

function resolveMissionPasswordForViewer(input: {
	db: DbConnection;
	row: MissionRow;
	slotting: ReturnType<typeof parseCanonicalSlotting>;
	viewerUserId: number;
}): GameMissionPassword {
	const heldSlot = findUserHeldSlot(input.slotting, input.viewerUserId);
	const hasPriorityGameplayAccess = heldSlot?.slot.access === 'priority';
	const hasRegularGameplayAccess = input.row.regular_gameplay_released_at
		? userHasMissionRegularGameplayAccess(input.db, input.row.id, input.viewerUserId)
		: false;

	if (input.row.priority_gameplay_released_at) {
		if (hasPriorityGameplayAccess || hasRegularGameplayAccess) {
			if (input.row.final_password) {
				return {
					stage: 'final',
					value: input.row.final_password
				};
			}
		}

		return {
			stage: 'early',
			value: input.row.early_password ?? null
		};
	}

	return {
		stage: 'early',
		value: input.row.early_password ?? null
	};
}

function mapMissionDetailForViewer(input: {
	db: DbConnection;
	row: MissionRow & { status: 'published' | 'archived' };
	viewer: MissionParticipationUserRow;
	steamId64: string;
}): GameMissionDetail {
	const slotting = parseCanonicalSlotting(input.row.slotting_json);
	const heldSlot = findUserHeldSlot(slotting, input.viewer.id);
	const regularJoiners = selectMissionRegularJoiners(input.db, input.row.id);
	const joinedRegular = regularJoiners.some((joiner) => joiner.userId === input.viewer.id);
	const priorityBadgeLabels = selectUserMissionPriorityBadgeLabels(input.db, input.row.id, input.viewer.id);
	const hasPriorityBadge = priorityBadgeLabels.length > 0;
	const availablePrioritySlotCount = countAvailablePrioritySlots(slotting);
	const isPublished = input.row.status === 'published';
	const priorityClaimOpen = isPublished ? isPriorityClaimOpen(input.row) : false;
	const regularJoinOpen = isPublished ? isRegularJoinOpen(input.row, slotting) : false;

	return {
		status: input.row.status,
		shortCode: input.row.short_code ?? '',
		title: input.row.title,
		description: parseLocalizedDescription(input.row.description),
		startsAt: input.row.starts_at ?? null,
		serverName: input.row.server_name,
		serverHost: input.row.server_host,
		serverPort: input.row.server_port ?? null,
		serverDetailsHidden: !!input.row.server_details_hidden,
		priorityClaimOpensAt: input.row.priority_claim_opens_at ?? null,
		priorityClaimManualState: input.row.priority_claim_manual_state,
		priorityClaimOpen,
		priorityGameplayReleasedAt: input.row.priority_gameplay_released_at ?? null,
		regularJoinEnabled: !!input.row.regular_join_enabled,
		regularJoinOpen,
		regularGameplayReleasedAt: input.row.regular_gameplay_released_at ?? null,
		archivedAt: input.row.archived_at ?? null,
		archiveStatus: input.row.archive_status ?? null,
		archiveReason: input.row.archive_reason ?? null,
		archiveResult: parseStoredArchiveResult(input.row.archive_result_json ?? null),
		availablePrioritySlotCount,
		slotting,
		regularJoiners,
		password: isPublished
			? resolveMissionPasswordForViewer({
				db: input.db,
				row: input.row,
				slotting,
				viewerUserId: input.viewer.id
			})
			: { stage: null, value: null },
		viewer: {
			userId: input.viewer.id,
			steamId64: input.steamId64,
			callsign: input.viewer.current_callsign ?? null,
			hasPriorityBadge,
			priorityBadgeLabels,
			heldSlotId: heldSlot?.slot.id ?? null,
			heldSlotAccess: heldSlot?.slot.access ?? null,
			joinedRegular,
			canClaimPriority:
				isPublished && priorityClaimOpen && availablePrioritySlotCount > 0 && !heldSlot && hasPriorityBadge,
			canSwitchPriority:
				isPublished && priorityClaimOpen && heldSlot?.slot.access === 'priority' && availablePrioritySlotCount > 0,
			canJoinRegular:
				isPublished &&
				regularJoinOpen &&
				!joinedRegular &&
				!heldSlot,
			canLeaveRegular: isPublished && joinedRegular
		}
	};
}

function normalizeArchiveCompletedResult(input: {
	slotting: ReturnType<typeof parseCanonicalSlotting>;
	result: { winnerSideId: string | null; sideScores: Array<{ sideId: string; score: number }> };
}): GameArchiveResult | null {
	const sideIds = input.slotting.sides.map((side) => side.id);
	const validSideIds = new Set(sideIds);
	const winnerSideId = input.result.winnerSideId;
	const sideScores = input.result.sideScores;

	if (winnerSideId !== null && !validSideIds.has(winnerSideId)) {
		return null;
	}

	if (sideScores.length === 0) {
		return {
			outcome: winnerSideId ? 'winner' : 'draw',
			winnerSideId,
			sideScores: []
		};
	}

	if (sideScores.length !== sideIds.length) {
		return null;
	}

	const uniqueIds = new Set(sideScores.map((score) => score.sideId));
	if (uniqueIds.size !== sideScores.length) {
		return null;
	}

	for (const score of sideScores) {
		if (!validSideIds.has(score.sideId)) {
			return null;
		}
	}

	const maxScore = Math.max(...sideScores.map((score) => score.score));
	const winners = sideScores.filter((score) => score.score === maxScore);
	const computedWinnerSideId = winners.length === 1 ? winners[0]?.sideId ?? null : null;
	if (winnerSideId !== null && winnerSideId !== computedWinnerSideId) {
		return null;
	}

	return {
		outcome: computedWinnerSideId ? 'winner' : 'draw',
		winnerSideId: computedWinnerSideId,
		sideScores: sideScores.map((score) => {
			const side = input.slotting.sides.find((s) => s.id === score.sideId);
			return { sideId: score.sideId, sideName: side?.displayName ?? side?.name ?? score.sideId, score: score.score };
		})
	};
}

function badgeTypeIdsExist(db: DbConnection, badgeTypeIds: number[]): boolean {
	if (badgeTypeIds.length === 0) return true;

	const placeholders = badgeTypeIds.map(() => '?').join(', ');
	const rows = db
		.prepare(`SELECT id FROM badge_types WHERE id IN (${placeholders})`)
		.all(...badgeTypeIds) as Array<{ id: number }>;

	return new Set(rows.map((row) => row.id)).size === new Set(badgeTypeIds).size;
}

function resolvePasswordUpdate(
	currentValue: string | null,
	nextValue: string | null | undefined
): string | null {
	if (nextValue === undefined) {
		return currentValue;
	}

	return nextValue;
}

function isSqliteConstraintError(error: unknown, needle: string): boolean {
	return error instanceof Error && error.message.includes(needle);
}

function validatePublishableMission(input: {
	row: MissionRow;
	priorityBadgeCount: number;
}): GamePublishValidationError[] {
	const reasons: GamePublishValidationError[] = [];
	let slottingHasPrioritySlots = false;

	try {
		const slotting = parseCanonicalSlotting(input.row.slotting_json);
		slottingHasPrioritySlots = hasPrioritySlots(slotting);
	} catch {
		reasons.push('slotting_invalid');
	}

	if (!input.row.short_code) {
		reasons.push('short_code_required');
	} else if (!/^[A-Za-z0-9-]+$/.test(input.row.short_code)) {
		reasons.push('short_code_invalid');
	}

	if (!input.row.starts_at) reasons.push('starts_at_required');
	if (!isNonEmptyText(input.row.server_name)) reasons.push('server_name_required');
	if (!isNonEmptyText(input.row.server_host)) reasons.push('server_host_required');
	if (input.row.server_port == null) reasons.push('server_port_required');
	if (!isNonEmptyText(input.row.early_password)) {
		reasons.push('early_password_required');
	}
	if (slottingHasPrioritySlots && input.priorityBadgeCount < 1) {
		reasons.push('priority_badge_required');
	}

	return reasons;
}

function saveSlottingUpdate(input: {
	db: DbConnection;
	row: MissionRow;
	missionId: number;
	slottingRevision: number;
	nextSlotting: ReturnType<typeof parseCanonicalSlotting>;
	updatedBySteamId64: string;
	confirmDestructive: boolean;
	source: 'canonical' | 'legacy_import';
}):
	| { success: true; mission: GameAdminMission }
	| {
			success: false;
			error: 'slotting_revision_conflict' | 'regular_join_requires_regular_slots' | 'destructive_change_requires_confirmation' | 'database_error';
			destructiveChanges?: ReturnType<typeof detectDestructiveSlottingChanges>;
	  } {
	const selectMission = input.db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const updateMissionSlotting = input.db.prepare(`
		UPDATE missions
		SET slotting_json = ?,
			slotting_revision = slotting_revision + 1,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND slotting_revision = ?
	`);
	const insertAudit = input.db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.slotting.updated', ?)
	`);

	const currentSlotting = parseCanonicalSlotting(input.row.slotting_json);
	if (input.row.regular_join_enabled && !hasRegularSlots(input.nextSlotting)) {
		return { success: false, error: 'regular_join_requires_regular_slots' };
	}

	const destructiveChanges =
		input.row.status === 'published' ? detectDestructiveSlottingChanges(currentSlotting, input.nextSlotting) : [];
	if (input.row.status === 'published' && destructiveChanges.length > 0 && !input.confirmDestructive) {
		return {
			success: false,
			error: 'destructive_change_requires_confirmation',
			destructiveChanges
		};
	}

	const updatedInfo = updateMissionSlotting.run(
		JSON.stringify(input.nextSlotting),
		input.updatedBySteamId64,
		input.missionId,
		input.slottingRevision
	);
	if (updatedInfo.changes === 0) {
		return { success: false, error: 'slotting_revision_conflict' };
	}

	const updated = selectMission.get(input.missionId) as MissionRow | undefined;
	if (!updated) {
		return { success: false, error: 'database_error' };
	}

	insertAudit.run(
		input.missionId,
		input.updatedBySteamId64,
		JSON.stringify({
			source: input.source,
			before: currentSlotting,
			after: input.nextSlotting,
			destructiveChanges
		})
	);

	return { success: true, mission: mapMissionRow(input.db, updated) };
}

export function getAdminGamesOverview(): AdminGamesOverview {
	const db = getDb();
	const draftRow = db
		.prepare(`
			SELECT ${selectMissionColumns()}
			FROM missions
			WHERE status = 'draft'
			LIMIT 1
		`)
		.get() as MissionRow | undefined;
	const publishedRow = db
		.prepare(`
			SELECT ${selectMissionColumns()}
			FROM missions
			WHERE status = 'published'
			LIMIT 1
		`)
		.get() as MissionRow | undefined;
	const archivedRows = db
		.prepare(`
			SELECT ${selectMissionColumns()}
			FROM missions
			WHERE status = 'archived'
			ORDER BY COALESCE(archived_at, updated_at) DESC, id DESC
		`)
		.all() as MissionRow[];

	return {
		draft: draftRow ? mapMissionRow(db, draftRow) : null,
		published: publishedRow ? mapMissionRow(db, publishedRow) : null,
		archivedMissions: archivedRows.map((row) => mapMissionRow(db, row))
	};
}

export function createDraft(input: {
	mode: 'blank' | 'duplicate_previous';
	createdBySteamId64: string;
}): CreateGameDraftRepoResult {
	const db = getDb();
	const selectDraft = db.prepare(`
		SELECT 1
		FROM missions
		WHERE status = 'draft'
		LIMIT 1
	`);
	const selectPublishedSource = db.prepare(`
		SELECT slotting_json
		FROM missions
		WHERE status = 'published'
		LIMIT 1
	`);
	const selectArchivedSource = db.prepare(`
		SELECT slotting_json
		FROM missions
		WHERE status = 'archived'
		ORDER BY COALESCE(archived_at, updated_at) DESC, id DESC
		LIMIT 1
	`);
	const insertDraft = db.prepare(`
		INSERT INTO missions (
			short_code,
			status,
			title,
			description,
			starts_at,
			server_name,
			server_host,
			server_port,
			early_password,
			final_password,
			priority_claim_opens_at,
			priority_claim_manual_state,
			regular_join_enabled,
			priority_gameplay_released_at,
			regular_gameplay_released_at,
			slotting_json,
			slotting_revision,
			settings_revision,
			published_at,
			archived_at,
			archive_status,
			archive_reason,
			archive_result_json,
			created_by_steamid64,
			updated_by_steamid64
		)
		VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?)
	`);
	const selectInserted = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.created', ?)
	`);

	try {
		const run = db.transaction((): CreateGameDraftRepoResult => {
			if (selectDraft.get()) {
				return { success: false, error: 'draft_exists' };
			}

			let slottingJson = JSON.stringify(emptyCanonicalSlotting);
			if (input.mode === 'duplicate_previous') {
				const sourceRow =
					(selectPublishedSource.get() as { slotting_json: string } | undefined) ??
					(selectArchivedSource.get() as { slotting_json: string } | undefined);
				if (!sourceRow) {
					return { success: false, error: 'no_source_mission' };
				}
				slottingJson = JSON.stringify(clearUserOccupants(parseCanonicalSlotting(sourceRow.slotting_json)));
			}

			const inserted = insertDraft.run(
				null,
				'',
				JSON.stringify(emptyLocalizedDescription),
				null,
				'',
				'',
				null,
				null,
				null,
				null,
				'default',
				0,
				null,
				null,
				slottingJson,
				null,
				null,
				null,
				null,
				null,
				input.createdBySteamId64,
				input.createdBySteamId64
			);

			const rowIdRaw = inserted.lastInsertRowid;
			const rowId = typeof rowIdRaw === 'bigint' ? Number(rowIdRaw) : (rowIdRaw as number);
			insertAudit.run(rowId, input.createdBySteamId64, JSON.stringify({ mode: input.mode }));
			const created = selectInserted.get(rowId) as MissionRow | undefined;
			if (!created) {
				return { success: false, error: 'database_error' };
			}

			return { success: true, mission: mapMissionRow(db, created) };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function getMissionById(input: { missionId: number }): GetAdminGameMissionRepoResult {
	const db = getDb();
	const row = db
		.prepare(`
			SELECT ${selectMissionColumns()}
			FROM missions
			WHERE id = ?
			LIMIT 1
		`)
		.get(input.missionId) as MissionRow | undefined;

	if (!row) {
		return { success: false, error: 'not_found' };
	}

	try {
		return { success: true, mission: mapMissionRow(db, row) };
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function deleteCurrentDraft(): DeleteCurrentDraftRepoResult {
	const db = getDb();
	const selectDraft = db.prepare(`
		SELECT id
		FROM missions
		WHERE status = 'draft'
		LIMIT 1
	`);
	const deleteMission = db.prepare(`
		DELETE FROM missions
		WHERE id = ?
	`);

	try {
		const run = db.transaction((): DeleteCurrentDraftRepoResult => {
			const row = selectDraft.get() as { id: number } | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			deleteMission.run(row.id);
			return { success: true };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function updateSettings(
	input: UpdateGameSettingsRequest & { missionId: number; updatedBySteamId64: string }
): UpdateGameSettingsRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const selectShortCodeConflict = db.prepare(`
		SELECT id
		FROM missions
		WHERE id != ?
			AND short_code IS NOT NULL
			AND TRIM(short_code) != ''
			AND LOWER(short_code) = LOWER(?)
		LIMIT 1
	`);
	const updateMission = db.prepare(`
		UPDATE missions
		SET short_code = ?,
			title = ?,
			description = ?,
			starts_at = ?,
			server_name = ?,
			server_host = ?,
			server_port = ?,
			early_password = ?,
			final_password = ?,
			priority_claim_opens_at = ?,
			priority_claim_manual_state = ?,
			regular_join_enabled = ?,
			server_details_hidden = ?,
			settings_revision = settings_revision + 1,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND settings_revision = ?
	`);
	const deletePriorityBadges = db.prepare(`
		DELETE FROM mission_priority_badges
		WHERE mission_id = ?
	`);
	const insertPriorityBadge = db.prepare(`
		INSERT INTO mission_priority_badges (mission_id, badge_type_id)
		VALUES (?, ?)
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.settings.updated', ?)
	`);

	try {
		const run = db.transaction((): UpdateGameSettingsRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.settings_revision !== input.settingsRevision) {
				return { success: false, error: 'settings_revision_conflict' };
			}

			const slotting = parseCanonicalSlotting(row.slotting_json);
			if (input.regularJoinEnabled && !hasRegularSlots(slotting)) {
				return { success: false, error: 'regular_join_requires_regular_slots' };
			}

			const badgeTypeIds = [...new Set(input.priorityBadgeTypeIds)];
			if (!badgeTypeIdsExist(db, badgeTypeIds)) {
				return { success: false, error: 'badge_not_found' };
			}

			const currentShortCode = row.short_code ?? null;
			const nextShortCode = input.shortCode;
			if (row.status !== 'draft' && nextShortCode !== currentShortCode) {
				return { success: false, error: 'short_code_locked' };
			}

			if (nextShortCode) {
				const shortCodeConflict = selectShortCodeConflict.get(input.missionId, nextShortCode) as
					| { id: number }
					| undefined;
				if (shortCodeConflict) {
					return { success: false, error: 'short_code_taken' };
				}
			}

			const beforeBadgeTypeIds = selectPriorityBadgeTypeIds(db, input.missionId);
			const before = mapMissionSettingsAudit(row, beforeBadgeTypeIds);
			const earlyPw = resolvePasswordUpdate(row.early_password, input.earlyPassword);
			const finalPw = resolvePasswordUpdate(row.final_password, input.finalPassword);

			const updatedInfo = updateMission.run(
				nextShortCode,
				input.title,
				JSON.stringify(input.description),
				input.startsAt,
				input.serverName,
				input.serverHost,
				input.serverPort,
				earlyPw,
				finalPw,
				input.priorityClaimOpensAt,
				input.priorityClaimManualState,
				input.regularJoinEnabled ? 1 : 0,
				input.serverDetailsHidden ? 1 : 0,
				input.updatedBySteamId64,
				input.missionId,
				input.settingsRevision
			);

			if (updatedInfo.changes === 0) {
				return { success: false, error: 'settings_revision_conflict' };
			}

			deletePriorityBadges.run(input.missionId);
			for (const badgeTypeId of badgeTypeIds) {
				insertPriorityBadge.run(input.missionId, badgeTypeId);
			}

			const updated = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!updated) {
				return { success: false, error: 'database_error' };
			}

			const afterBadgeTypeIds = selectPriorityBadgeTypeIds(db, input.missionId);
			insertAudit.run(
				input.missionId,
				input.updatedBySteamId64,
				JSON.stringify({
					before,
					after: mapMissionSettingsAudit(updated, afterBadgeTypeIds)
				})
			);

			return { success: true, mission: mapMissionRow(db, updated) };
		});

		return run();
	} catch (error: unknown) {
		if (
			isSqliteConstraintError(error, 'idx_missions_short_code_unique') ||
			isSqliteConstraintError(error, 'UNIQUE constraint failed: index')
		) {
			return { success: false, error: 'short_code_taken' };
		}
		return { success: false, error: 'database_error' };
	}
}

export function updateSlotting(
	input: UpdateGameSlottingRequest & { missionId: number; updatedBySteamId64: string }
): UpdateGameSlottingRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);

	try {
		const run = db.transaction((): UpdateGameSlottingRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.slotting_revision !== input.slottingRevision) {
				return { success: false, error: 'slotting_revision_conflict' };
			}

			const nextSlotting = parseCanonicalSlotting(input.slotting);
			return saveSlottingUpdate({
				db,
				row,
				missionId: input.missionId,
				slottingRevision: input.slottingRevision,
				nextSlotting,
				updatedBySteamId64: input.updatedBySteamId64,
				confirmDestructive: input.confirmDestructive,
				source: 'canonical'
			});
		});

		return run();
	} catch (error: unknown) {
		if (error instanceof Error && error.name === 'ZodError') {
			return { success: false, error: 'slotting_invalid' };
		}
		return { success: false, error: 'database_error' };
	}
}

export function importSlotting(
	input: ImportGameSlottingRequest & { missionId: number; updatedBySteamId64: string }
): ImportGameSlottingRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);

	try {
		const run = db.transaction((): ImportGameSlottingRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.slotting_revision !== input.slottingRevision) {
				return { success: false, error: 'slotting_revision_conflict' };
			}

			const existing = parseCanonicalSlotting(row.slotting_json);
			let nextSlotting;
			try {
				nextSlotting = normalizeLegacySlotting(input.legacyJson, { existing });
			} catch {
				return { success: false, error: 'legacy_slotting_invalid' };
			}

			return saveSlottingUpdate({
				db,
				row,
				missionId: input.missionId,
				slottingRevision: input.slottingRevision,
				nextSlotting,
				updatedBySteamId64: input.updatedBySteamId64,
				confirmDestructive: input.confirmDestructive,
				source: 'legacy_import'
			});
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function publishMission(
	input: PublishGameRequest & { missionId: number; publishedBySteamId64: string }
): PublishGameRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const selectExistingPublishedMission = db.prepare(`
		SELECT id
		FROM missions
		WHERE status = 'published' AND id != ?
		LIMIT 1
	`);
	const selectPriorityBadgeCount = db.prepare(`
		SELECT COUNT(1) AS count
		FROM mission_priority_badges
		WHERE mission_id = ?
	`);
	const publishMissionStatement = db.prepare(`
		UPDATE missions
		SET status = 'published',
			published_at = CURRENT_TIMESTAMP,
			published_by_steamid64 = ?,
			settings_revision = settings_revision + 1,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND settings_revision = ? AND status = 'draft'
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.published', ?)
	`);

	try {
		const run = db.transaction((): PublishGameRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.settings_revision !== input.settingsRevision) {
				return { success: false, error: 'settings_revision_conflict' };
			}

			if (row.status !== 'draft') {
				return { success: false, error: 'not_draft' };
			}

			if (selectExistingPublishedMission.get(input.missionId)) {
				return { success: false, error: 'published_mission_exists' };
			}

			const priorityBadgeCount =
				(selectPriorityBadgeCount.get(input.missionId) as { count?: number } | undefined)?.count ?? 0;
			const reasons = validatePublishableMission({ row, priorityBadgeCount });
			if (reasons.length > 0) {
				return { success: false, error: 'publish_validation_failed', reasons };
			}

			const updatedInfo = publishMissionStatement.run(
				input.publishedBySteamId64,
				input.publishedBySteamId64,
				input.missionId,
				input.settingsRevision
			);
			if (updatedInfo.changes === 0) {
				return { success: false, error: 'settings_revision_conflict' };
			}

			const published = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!published) {
				return { success: false, error: 'database_error' };
			}

			insertAudit.run(
				input.missionId,
				input.publishedBySteamId64,
				JSON.stringify({ shortCode: published.short_code ?? null })
			);

			return { success: true, mission: mapMissionRow(db, published) };
		});

		return run();
	} catch (error: unknown) {
		if (
			isSqliteConstraintError(error, 'idx_missions_single_published') ||
			isSqliteConstraintError(error, 'UNIQUE constraint failed: missions.status')
		) {
			return { success: false, error: 'published_mission_exists' };
		}
		return { success: false, error: 'database_error' };
	}
}

export function releasePriorityGameplay(input: {
	missionId: number;
	releasedBySteamId64: string;
}): ReleasePriorityGameplayRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const releaseMission = db.prepare(`
		UPDATE missions
		SET priority_gameplay_released_at = CURRENT_TIMESTAMP,
			priority_claim_manual_state = 'closed',
			regular_join_enabled = 0,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND priority_gameplay_released_at IS NULL
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.priority_gameplay.released', ?)
	`);

	try {
		const run = db.transaction((): ReleasePriorityGameplayRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.status !== 'published') {
				return { success: false, error: 'not_published' };
			}

			if (!isNonEmptyText(row.final_password)) {
				return { success: false, error: 'final_password_required' };
			}

			if (row.priority_gameplay_released_at) {
				return { success: false, error: 'already_released' };
			}

			const updatedInfo = releaseMission.run(input.releasedBySteamId64, input.missionId);
			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.missionId) as MissionRow | undefined;
				if (!fresh) {
					return { success: false, error: 'not_found' };
				}
				if (fresh.priority_gameplay_released_at) {
					return { success: false, error: 'already_released' };
				}
				return { success: false, error: 'database_error' };
			}

			const updated = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!updated) {
				return { success: false, error: 'database_error' };
			}

			insertAudit.run(
				input.missionId,
				input.releasedBySteamId64,
				JSON.stringify({ shortCode: updated.short_code ?? null })
			);

			return { success: true, mission: mapMissionRow(db, updated) };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function releaseRegularGameplay(input: {
	missionId: number;
	releasedBySteamId64: string;
}): ReleaseRegularGameplayRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const snapshotCurrentJoins = db.prepare(`
		INSERT OR IGNORE INTO mission_regular_release_snapshot (mission_id, user_id, released_at)
		SELECT mission_id, user_id, CURRENT_TIMESTAMP
		FROM mission_regular_joins
		WHERE mission_id = ?
	`);
	const releaseMission = db.prepare(`
		UPDATE missions
		SET regular_gameplay_released_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND regular_gameplay_released_at IS NULL
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.regular_gameplay.released', ?)
	`);

	try {
		const run = db.transaction((): ReleaseRegularGameplayRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.status !== 'published') {
				return { success: false, error: 'not_published' };
			}

			if (!row.priority_gameplay_released_at) {
				return { success: false, error: 'priority_release_required' };
			}

			if (!isNonEmptyText(row.final_password)) {
				return { success: false, error: 'final_password_required' };
			}

			if (row.regular_gameplay_released_at) {
				return { success: false, error: 'already_released' };
			}

			const snapshotInfo = snapshotCurrentJoins.run(input.missionId);
			const updatedInfo = releaseMission.run(input.releasedBySteamId64, input.missionId);
			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.missionId) as MissionRow | undefined;
				if (!fresh) {
					return { success: false, error: 'not_found' };
				}
				if (fresh.regular_gameplay_released_at) {
					return { success: false, error: 'already_released' };
				}
				return { success: false, error: 'database_error' };
			}

			const updated = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!updated) {
				return { success: false, error: 'database_error' };
			}

			insertAudit.run(
				input.missionId,
				input.releasedBySteamId64,
				JSON.stringify({
					shortCode: updated.short_code ?? null,
					recipientCount: snapshotInfo.changes
				})
			);

			return { success: true, mission: mapMissionRow(db, updated) };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function hidePriorityGameplay(input: {
	missionId: number;
	hiddenBySteamId64: string;
}): HidePriorityGameplayRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const hideMission = db.prepare(`
		UPDATE missions
		SET priority_gameplay_released_at = NULL,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND priority_gameplay_released_at IS NOT NULL
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.priority_gameplay.hidden', ?)
	`);

	try {
		const run = db.transaction((): HidePriorityGameplayRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.status !== 'published') {
				return { success: false, error: 'not_published' };
			}

			if (row.regular_gameplay_released_at) {
				return { success: false, error: 'regular_release_hide_required' };
			}

			if (!row.priority_gameplay_released_at) {
				return { success: false, error: 'already_hidden' };
			}

			const updatedInfo = hideMission.run(input.hiddenBySteamId64, input.missionId);
			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.missionId) as MissionRow | undefined;
				if (!fresh) {
					return { success: false, error: 'not_found' };
				}
				if (!fresh.priority_gameplay_released_at) {
					return { success: false, error: 'already_hidden' };
				}
				return { success: false, error: 'database_error' };
			}

			const updated = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!updated) {
				return { success: false, error: 'database_error' };
			}

			insertAudit.run(
				input.missionId,
				input.hiddenBySteamId64,
				JSON.stringify({ shortCode: updated.short_code ?? null })
			);

			return { success: true, mission: mapMissionRow(db, updated) };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function hideRegularGameplay(input: {
	missionId: number;
	hiddenBySteamId64: string;
}): HideRegularGameplayRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const hideMission = db.prepare(`
		UPDATE missions
		SET regular_gameplay_released_at = NULL,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND regular_gameplay_released_at IS NOT NULL
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.regular_gameplay.hidden', ?)
	`);

	try {
		const run = db.transaction((): HideRegularGameplayRepoResult => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'not_found' };
			}

			if (row.status !== 'published') {
				return { success: false, error: 'not_published' };
			}

			if (!row.regular_gameplay_released_at) {
				return { success: false, error: 'already_hidden' };
			}

			const updatedInfo = hideMission.run(input.hiddenBySteamId64, input.missionId);
			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.missionId) as MissionRow | undefined;
				if (!fresh) {
					return { success: false, error: 'not_found' };
				}
				if (!fresh.regular_gameplay_released_at) {
					return { success: false, error: 'already_hidden' };
				}
				return { success: false, error: 'database_error' };
			}

			const updated = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!updated) {
				return { success: false, error: 'database_error' };
			}

			insertAudit.run(
				input.missionId,
				input.hiddenBySteamId64,
				JSON.stringify({ shortCode: updated.short_code ?? null })
			);

			return { success: true, mission: mapMissionRow(db, updated) };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function archiveGame(input: {
	missionId: number;
	archivedBySteamId64: string;
	result: { winnerSideId: string | null; sideScores: Array<{ sideId: string; score: number }> };
}): import('@/features/games/ports').ArchiveGameRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const archiveMission = db.prepare(`
		UPDATE missions
		SET status = 'archived',
			archived_at = CURRENT_TIMESTAMP,
			archive_status = 'completed',
			archive_reason = NULL,
			archive_result_json = ?,
			priority_claim_manual_state = 'closed',
			regular_join_enabled = 0,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?,
			archived_by_steamid64 = ?
		WHERE id = ? AND status = 'published'
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.archived', ?)
	`);

	try {
		const run = db.transaction(() => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false as const, error: 'not_found' as const };
			}

			if (row.status === 'archived') {
				return { success: false as const, error: 'already_archived' as const };
			}

			if (row.status !== 'published') {
				return { success: false as const, error: 'not_published' as const };
			}

			const slotting = parseCanonicalSlotting(row.slotting_json);
			const archiveResult = normalizeArchiveCompletedResult({ slotting, result: input.result });
			if (!archiveResult) {
				return { success: false as const, error: 'archive_result_invalid' as const };
			}

			const updatedInfo = archiveMission.run(
				JSON.stringify(archiveResult),
				input.archivedBySteamId64,
				input.archivedBySteamId64,
				input.missionId
			);
			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.missionId) as MissionRow | undefined;
				if (!fresh) {
					return { success: false as const, error: 'not_found' as const };
				}
				if (fresh.status === 'archived') {
					return { success: false as const, error: 'already_archived' as const };
				}
				return { success: false as const, error: 'database_error' as const };
			}

			const updated = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!updated) {
				return { success: false as const, error: 'database_error' as const };
			}

			insertAudit.run(
				input.missionId,
				input.archivedBySteamId64,
				JSON.stringify({
					shortCode: updated.short_code ?? null,
					archiveStatus: 'completed',
					archiveResult
				})
			);

			return { success: true as const, mission: mapMissionRow(db, updated) };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function cancelGame(input: {
	missionId: number;
	archivedBySteamId64: string;
	reason: string;
}): import('@/features/games/ports').CancelGameRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const cancelMission = db.prepare(`
		UPDATE missions
		SET status = 'archived',
			archived_at = CURRENT_TIMESTAMP,
			archive_status = 'canceled',
			archive_reason = ?,
			archive_result_json = NULL,
			priority_claim_manual_state = 'closed',
			regular_join_enabled = 0,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?,
			archived_by_steamid64 = ?
		WHERE id = ? AND status = 'published'
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, 'mission.canceled', ?)
	`);

	try {
		const run = db.transaction(() => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false as const, error: 'not_found' as const };
			}

			if (row.status === 'archived') {
				return { success: false as const, error: 'already_archived' as const };
			}

			if (row.status !== 'published') {
				return { success: false as const, error: 'not_published' as const };
			}

			if (!input.reason.trim()) {
				return { success: false as const, error: 'cancel_reason_required' as const };
			}

			const updatedInfo = cancelMission.run(
				input.reason.trim(),
				input.archivedBySteamId64,
				input.archivedBySteamId64,
				input.missionId
			);
			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.missionId) as MissionRow | undefined;
				if (!fresh) {
					return { success: false as const, error: 'not_found' as const };
				}
				if (fresh.status === 'archived') {
					return { success: false as const, error: 'already_archived' as const };
				}
				return { success: false as const, error: 'database_error' as const };
			}

			const updated = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!updated) {
				return { success: false as const, error: 'database_error' as const };
			}

			insertAudit.run(
				input.missionId,
				input.archivedBySteamId64,
				JSON.stringify({
					shortCode: updated.short_code ?? null,
					archiveStatus: 'canceled',
					reason: input.reason.trim()
				})
			);

			return { success: true as const, mission: mapMissionRow(db, updated) };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function deleteArchivedMission(
	input: DeleteArchivedMissionRequest & { missionId: number }
): DeleteArchivedMissionRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE id = ?
		LIMIT 1
	`);
	const deleteMission = db.prepare(`
		DELETE FROM missions
		WHERE id = ? AND status = 'archived'
	`);

	try {
		const run = db.transaction(() => {
			const row = selectMission.get(input.missionId) as MissionRow | undefined;
			if (!row) {
				return { success: false as const, error: 'not_found' as const };
			}

			if (row.status !== 'archived') {
				return { success: false as const, error: 'not_archived' as const };
			}

			if (row.title !== input.titleConfirmation) {
				return { success: false as const, error: 'title_confirmation_mismatch' as const };
			}

			const deleted = deleteMission.run(input.missionId);
			if (deleted.changes === 0) {
				const fresh = selectMission.get(input.missionId) as MissionRow | undefined;
				if (!fresh) {
					return { success: false as const, error: 'not_found' as const };
				}
				if (fresh.status !== 'archived') {
					return { success: false as const, error: 'not_archived' as const };
				}
				return { success: false as const, error: 'database_error' as const };
			}

			return { success: true as const };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function getMissionAuditHistory(input: { missionId: number }): GetMissionAuditRepoResult {
	const db = getDb();
	const missionExists = db
		.prepare(`
			SELECT 1
			FROM missions
			WHERE id = ?
			LIMIT 1
		`)
		.get(input.missionId) as { 1?: number } | undefined;

	if (!missionExists) {
		return { success: false, error: 'not_found' };
	}

	try {
		const rows = db
			.prepare(`
				SELECT mae.id,
					mae.event_type,
					mae.created_at,
					mae.actor_user_id,
					mae.actor_steamid64,
					COALESCE(u_by_id.current_callsign, u_by_steam.current_callsign) AS actor_callsign,
					mae.payload
				FROM mission_audit_events mae
				LEFT JOIN users u_by_id ON u_by_id.id = mae.actor_user_id
				LEFT JOIN user_identities ui_steam
					ON ui_steam.provider = 'steam'
					AND ui_steam.provider_user_id = mae.actor_steamid64
				LEFT JOIN users u_by_steam ON u_by_steam.id = ui_steam.user_id
				WHERE mae.mission_id = ?
				ORDER BY mae.created_at DESC, mae.id DESC
			`)
			.all(input.missionId) as MissionAuditRow[];

		return {
			success: true,
			events: rows.map((row) => ({
				id: row.id,
				eventType: row.event_type,
				createdAt: row.created_at,
				actorUserId: row.actor_user_id ?? null,
				actorSteamId64: row.actor_steamid64 ?? null,
				actorCallsign: row.actor_callsign ?? null,
				payload: parseAuditPayload(row.payload)
			}))
		};
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function claimPrioritySlot(input: {
	shortCode: string;
	slotId: string;
	steamId64: string;
}): ClaimPrioritySlotRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE status = 'published' AND short_code IS NOT NULL AND LOWER(short_code) = LOWER(?)
		LIMIT 1
	`);
	const deleteRegularJoin = db.prepare(`
		DELETE FROM mission_regular_joins
		WHERE mission_id = ? AND user_id = ?
	`);
	const updateMissionSlotting = db.prepare(`
		UPDATE missions
		SET slotting_json = ?,
			slotting_revision = slotting_revision + 1,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND slotting_revision = ?
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_user_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, ?, 'mission.slot.claimed', ?)
	`);

	try {
		const run = db.transaction((): ClaimPrioritySlotRepoResult => {
			const row = selectMission.get(input.shortCode) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'mission_not_found' };
			}

			if (!isPriorityClaimOpen(row)) {
				return { success: false, error: 'claim_closed' };
			}

			const user = getMissionParticipationUser(db, input.steamId64);
			if (!user) {
				return { success: false, error: 'database_error' };
			}

			const slotting = parseCanonicalSlotting(row.slotting_json);
			const slotContext = findSlotById(slotting, input.slotId);
			if (!slotContext || slotContext.slot.access !== 'priority') {
				return { success: false, error: 'slot_not_found' };
			}

			if (slotContext.slot.occupant?.type === 'user') {
				return { success: false, error: 'slot_taken' };
			}

			if (findUserHeldSlot(slotting, user.id)) {
				return { success: false, error: 'already_has_slot' };
			}

			if (!userHasMissionPriorityBadge(db, row.id, user.id)) {
				return { success: false, error: 'badge_required' };
			}

			const updatedSlotting = assignUserToPrioritySlot(slotting, {
				slotId: input.slotId,
				userId: user.id,
				callsign: user.current_callsign?.trim() || `Steam_${input.steamId64}`
			});

			const updatedInfo = updateMissionSlotting.run(
				JSON.stringify(updatedSlotting),
				input.steamId64,
				row.id,
				row.slotting_revision
			);

			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.shortCode) as MissionRow | undefined;
				if (!fresh) {
					return { success: false, error: 'mission_not_found' };
				}
				if (!isPriorityClaimOpen(fresh)) {
					return { success: false, error: 'claim_closed' };
				}
				const freshSlotting = parseCanonicalSlotting(fresh.slotting_json);
				const freshSlot = findSlotById(freshSlotting, input.slotId);
				if (!freshSlot || freshSlot.slot.access !== 'priority') {
					return { success: false, error: 'slot_not_found' };
				}
				if (freshSlot.slot.occupant?.type === 'user') {
					return { success: false, error: 'slot_taken' };
				}
				if (findUserHeldSlot(freshSlotting, user.id)) {
					return { success: false, error: 'already_has_slot' };
				}
				return { success: false, error: 'claim_conflict' };
			}

			deleteRegularJoin.run(row.id, user.id);

			insertAudit.run(
				row.id,
				user.id,
				input.steamId64,
				JSON.stringify({ slotId: input.slotId, shortCode: row.short_code ?? null })
			);

			return { success: true };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function switchPrioritySlot(input: {
	shortCode: string;
	slotId: string;
	steamId64: string;
}): SwitchPrioritySlotRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE status = 'published' AND short_code IS NOT NULL AND LOWER(short_code) = LOWER(?)
		LIMIT 1
	`);
	const deleteRegularJoin = db.prepare(`
		DELETE FROM mission_regular_joins
		WHERE mission_id = ? AND user_id = ?
	`);
	const updateMissionSlotting = db.prepare(`
		UPDATE missions
		SET slotting_json = ?,
			slotting_revision = slotting_revision + 1,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND slotting_revision = ?
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_user_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, ?, 'mission.slot.switched', ?)
	`);

	try {
		const run = db.transaction((): SwitchPrioritySlotRepoResult => {
			const row = selectMission.get(input.shortCode) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'mission_not_found' };
			}

			if (!isPriorityClaimOpen(row)) {
				return { success: false, error: 'claim_closed' };
			}

			const user = getMissionParticipationUser(db, input.steamId64);
			if (!user) {
				return { success: false, error: 'database_error' };
			}

			const slotting = parseCanonicalSlotting(row.slotting_json);
			const currentHeld = findUserHeldSlot(slotting, user.id);
			if (!currentHeld || currentHeld.slot.access !== 'priority') {
				return { success: false, error: 'no_current_slot' };
			}

			const target = findSlotById(slotting, input.slotId);
			if (!target || target.slot.access !== 'priority') {
				return { success: false, error: 'slot_not_found' };
			}

			if (target.slot.id === currentHeld.slot.id) {
				return { success: false, error: 'already_in_slot' };
			}

			if (target.slot.occupant?.type === 'user') {
				return { success: false, error: 'slot_taken' };
			}

			const updatedSlotting = switchUserPrioritySlot(slotting, {
				fromSlotId: currentHeld.slot.id,
				toSlotId: input.slotId,
				userId: user.id,
				callsign: user.current_callsign?.trim() || `Steam_${input.steamId64}`
			});

			const updatedInfo = updateMissionSlotting.run(
				JSON.stringify(updatedSlotting),
				input.steamId64,
				row.id,
				row.slotting_revision
			);

			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.shortCode) as MissionRow | undefined;
				if (!fresh) {
					return { success: false, error: 'mission_not_found' };
				}
				if (!isPriorityClaimOpen(fresh)) {
					return { success: false, error: 'claim_closed' };
				}
				const freshSlotting = parseCanonicalSlotting(fresh.slotting_json);
				const freshCurrentHeld = findUserHeldSlot(freshSlotting, user.id);
				if (!freshCurrentHeld || freshCurrentHeld.slot.access !== 'priority') {
					return { success: false, error: 'no_current_slot' };
				}
				const freshTarget = findSlotById(freshSlotting, input.slotId);
				if (!freshTarget || freshTarget.slot.access !== 'priority') {
					return { success: false, error: 'slot_not_found' };
				}
				if (freshTarget.slot.id === freshCurrentHeld.slot.id) {
					return { success: false, error: 'already_in_slot' };
				}
				if (freshTarget.slot.occupant?.type === 'user') {
					return { success: false, error: 'slot_taken' };
				}
				return { success: false, error: 'switch_conflict' };
			}

			deleteRegularJoin.run(row.id, user.id);

			insertAudit.run(
				row.id,
				user.id,
				input.steamId64,
				JSON.stringify({
					fromSlotId: currentHeld.slot.id,
					toSlotId: input.slotId,
					shortCode: row.short_code ?? null
				})
			);

			return { success: true };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function leavePrioritySlot(input: {
	shortCode: string;
	steamId64: string;
}): LeavePrioritySlotRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE status = 'published' AND short_code IS NOT NULL AND LOWER(short_code) = LOWER(?)
		LIMIT 1
	`);
	const updateMissionSlotting = db.prepare(`
		UPDATE missions
		SET slotting_json = ?,
			slotting_revision = slotting_revision + 1,
			updated_at = CURRENT_TIMESTAMP,
			updated_by_steamid64 = ?
		WHERE id = ? AND slotting_revision = ?
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_user_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, ?, 'mission.slot.left', ?)
	`);

	try {
		const run = db.transaction((): LeavePrioritySlotRepoResult => {
			const row = selectMission.get(input.shortCode) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'mission_not_found' };
			}

			const user = getMissionParticipationUser(db, input.steamId64);
			if (!user) {
				return { success: false, error: 'database_error' };
			}

			const slotting = parseCanonicalSlotting(row.slotting_json);
			const currentHeld = findUserHeldSlot(slotting, user.id);
			if (!currentHeld || currentHeld.slot.access !== 'priority') {
				return { success: false, error: 'no_current_slot' };
			}

			const updatedSlotting = releaseUserPrioritySlot(slotting, {
				slotId: currentHeld.slot.id,
				userId: user.id
			});

			const updatedInfo = updateMissionSlotting.run(
				JSON.stringify(updatedSlotting),
				input.steamId64,
				row.id,
				row.slotting_revision
			);

			if (updatedInfo.changes === 0) {
				const fresh = selectMission.get(input.shortCode) as MissionRow | undefined;
				if (!fresh) {
					return { success: false, error: 'mission_not_found' };
				}
				const freshSlotting = parseCanonicalSlotting(fresh.slotting_json);
				const freshCurrentHeld = findUserHeldSlot(freshSlotting, user.id);
				if (!freshCurrentHeld || freshCurrentHeld.slot.access !== 'priority') {
					return { success: false, error: 'no_current_slot' };
				}
				return { success: false, error: 'leave_conflict' };
			}

			insertAudit.run(
				row.id,
				user.id,
				input.steamId64,
				JSON.stringify({
					slotId: currentHeld.slot.id,
					shortCode: row.short_code ?? null
				})
			);

			return { success: true, left: true };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function joinRegularGame(input: {
	shortCode: string;
	steamId64: string;
}): JoinRegularGameRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT ${selectMissionColumns()}
		FROM missions
		WHERE status = 'published' AND short_code IS NOT NULL AND LOWER(short_code) = LOWER(?)
		LIMIT 1
	`);
	const insertJoin = db.prepare(`
		INSERT INTO mission_regular_joins (mission_id, user_id, joined_by_steamid64)
		VALUES (?, ?, ?)
		ON CONFLICT(mission_id, user_id) DO NOTHING
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_user_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, ?, 'mission.regular_joined', ?)
	`);

	try {
		const run = db.transaction((): JoinRegularGameRepoResult => {
			const row = selectMission.get(input.shortCode) as MissionRow | undefined;
			if (!row) {
				return { success: false, error: 'mission_not_found' };
			}

			const user = getMissionParticipationUser(db, input.steamId64);
			if (!user) {
				return { success: false, error: 'database_error' };
			}

			const slotting = parseCanonicalSlotting(row.slotting_json);
			if (!isRegularJoinOpen(row, slotting)) {
				return { success: false, error: 'join_closed' };
			}

			if (findUserHeldSlot(slotting, user.id)) {
				return { success: false, error: 'already_has_slot' };
			}

			const info = insertJoin.run(row.id, user.id, input.steamId64);
			if (info.changes > 0) {
				insertAudit.run(
					row.id,
					user.id,
					input.steamId64,
					JSON.stringify({ shortCode: row.short_code ?? null })
				);
			}

			return { success: true, joined: info.changes > 0 };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function leaveRegularGame(input: {
	shortCode: string;
	steamId64: string;
}): LeaveRegularGameRepoResult {
	const db = getDb();
	const selectMission = db.prepare(`
		SELECT id, short_code
		FROM missions
		WHERE status = 'published' AND short_code IS NOT NULL AND LOWER(short_code) = LOWER(?)
		LIMIT 1
	`);
	const deleteJoin = db.prepare(`
		DELETE FROM mission_regular_joins
		WHERE mission_id = ? AND user_id = ?
	`);
	const insertAudit = db.prepare(`
		INSERT INTO mission_audit_events (mission_id, actor_user_id, actor_steamid64, event_type, payload)
		VALUES (?, ?, ?, 'mission.regular_left', ?)
	`);

	try {
		const run = db.transaction((): LeaveRegularGameRepoResult => {
			const mission = selectMission.get(input.shortCode) as { id: number; short_code: string | null } | undefined;
			if (!mission) {
				return { success: false, error: 'mission_not_found' };
			}

			const user = getMissionParticipationUser(db, input.steamId64);
			if (!user) {
				return { success: false, error: 'database_error' };
			}

			const info = deleteJoin.run(mission.id, user.id);
			if (info.changes > 0) {
				insertAudit.run(
					mission.id,
					user.id,
					input.steamId64,
					JSON.stringify({ shortCode: mission.short_code ?? null })
				);
			}

			return { success: true, left: info.changes > 0 };
		});

		return run();
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function getGameByShortCode(input: {
	shortCode: string;
	steamId64: string;
}): GetGameByShortCodeRepoResult {
	const db = getDb();
	const row = db
		.prepare(`
			SELECT ${selectMissionColumns()}
			FROM missions
			WHERE status IN ('published', 'archived') AND short_code IS NOT NULL AND LOWER(short_code) = LOWER(?)
			LIMIT 1
		`)
		.get(input.shortCode) as MissionRow | undefined;

	if (!row?.short_code) {
		return { success: false, error: 'not_found' };
	}
	if (row.status !== 'published' && row.status !== 'archived') {
		return { success: false, error: 'not_found' };
	}
	const missionRow = row as MissionRow & { status: 'published' | 'archived' };

	try {
		const viewer = getMissionParticipationUser(db, input.steamId64);
		if (!viewer) {
			return { success: false, error: 'database_error' };
		}

		return {
			success: true,
			mission: mapMissionDetailForViewer({ db, row: missionRow, viewer, steamId64: input.steamId64 })
		};
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function getArchivedGameSummaries(): GetGameArchiveSummariesRepoResult {
	const db = getDb();

	try {
		const rows = db
			.prepare(`
				SELECT ${selectMissionColumns()}
				FROM missions
				WHERE status = 'archived'
				ORDER BY COALESCE(archived_at, updated_at) DESC, id DESC
			`)
			.all() as MissionRow[];

		return {
			success: true,
			archive: rows
				.map((row) => mapArchiveSummaryRow(row))
				.filter((mission): mission is GameArchiveSummary => mission !== null)
		};
	} catch {
		return { success: false, error: 'database_error' };
	}
}

export function getCurrentPublishedSummary(): CurrentGameSummary | null {
	const db = getDb();
	const row = db
		.prepare(`
			SELECT short_code, title, description, starts_at
			FROM missions
			WHERE status = 'published'
			LIMIT 1
		`)
		.get() as
		| {
				short_code: string | null;
				title: string;
				description: string;
				starts_at: string | null;
		  }
		| undefined;

	if (!row?.short_code) {
		return null;
	}

	return {
		shortCode: row.short_code,
		title: row.title,
		description: parseLocalizedDescription(row.description),
		startsAt: row.starts_at ?? null
	};
}
