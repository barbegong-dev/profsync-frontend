// Remembers the last workspace (tenant) the user signed in to, so they only type it once.
const KEY = 'workspace';

export interface Workspace {
    name: string;
    slug: string;
}

export const getSavedWorkspace = (): Workspace | null => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const saveWorkspace = (workspace: Workspace | null) => {
    try {
        if (workspace) {
            localStorage.setItem(KEY, JSON.stringify(workspace));
        } else {
            localStorage.removeItem(KEY);
        }
    } catch {
        // Storage unavailable (private mode); the user just types the workspace again next time
    }
};
