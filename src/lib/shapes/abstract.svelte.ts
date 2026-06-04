import type { Position } from "$lib/canvas.svelte";

export abstract class CanvasElement {
    selected: boolean = $state(false);
	color: string = $state('hwb(0 0% 100%)');
    lineWidth = $state(1);

    abstract render(position: Position, ctx: CanvasRenderingContext2D): void;
    abstract isOnScreen(position: Position, width: number, height: number): boolean;
    abstract checkClick(clickX: number, clickY: number, position: Position): boolean;
    abstract drag(dx: number, dy: number): void;
    abstract resize(dx: number, dy: number): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	abstract toJSON(): Record<string, any>;
}