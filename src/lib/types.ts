import type { CanvasElement } from "./shapes/abstract.svelte";

export type Point = { x: number, y: number; }

export type Mode = 'select' | 'drag' | 'erase' | 'create';

export type HistoryEntry =
	| {
			action: 'create';
			detail: {
				element: CanvasElement;
			};
	  }
	| {
			action: 'move';
			detail: {
				element: CanvasElement;
				positionChange: {
					x: number;
					y: number;
				};
			};
	  }
	| {
			action: 'delete';
			detail: {
				elements: CanvasElement[];
			};
	  };