import type { HistoryEntry } from "./types";

export class History {
	entries: HistoryEntry[] = $state([]);
	position = $state(0);
    canUndo = $derived(this.position > 0);
    canRedo = $derived(this.position < this.entries.length);

    append(entry: HistoryEntry) {
		if (this.position <= this.entries.length) this.entries.splice(this.position);
		this.entries.push(entry);
		this.position++;
    }

    undo() {
        if(!this.canUndo) return;
        return this.entries[--this.position];
    }

    redo() {
        if(!this.canRedo) return;
        return this.entries[this.position++];
    }

    clear() {
        this.entries = [];
        this.position = 0;
    }
}