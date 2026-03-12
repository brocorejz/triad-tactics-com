import type { DeleteCurrentDraftDeps } from '../ports';

export type DeleteCurrentDraftResult =
	| { ok: true }
	| { ok: false; error: 'not_found' | 'database_error' };

export function deleteCurrentDraft(deps: DeleteCurrentDraftDeps): DeleteCurrentDraftResult {
	const result = deps.repo.deleteCurrentDraft();
	if (result.success) return { ok: true };
	return { ok: false, error: result.error };
}
