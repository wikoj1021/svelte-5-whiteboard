import type { Position } from '$lib/canvas.svelte';
import { drawSelectionFrame, getPosFromEvent } from '$lib/helpers';
import { on } from 'svelte/events';
import { CanvasElement } from './abstract.svelte';

export class Rectangle extends CanvasElement {
	x: number = $state(0);
	y: number = $state(0);

	width: number = $state(0);
	height: number = $state(0);

	render(position: Position, ctx: CanvasRenderingContext2D): void {
		ctx.strokeStyle = this.color;
		ctx.lineWidth = this.lineWidth;
		ctx.strokeRect(this.x + position.x, this.y + position.y, this.width, this.height);
		if (this.selected)
			drawSelectionFrame({ x: this.x, y: this.y }, this.width, this.height, position, ctx);
	}
	isOnScreen(position: Position, width: number, height: number): boolean {
		return (
			this.x + this.width + position.x > 0 &&
			this.y + this.height + position.y > 0 &&
			this.x + position.x < width &&
			this.y + position.y < height
		);
	}
	checkClick(clickX: number, clickY: number, position: Position): boolean {
		return (
			this.x + this.width + position.x > clickX &&
			this.y + this.height + position.y > clickY &&
			this.x + position.x < clickX &&
			this.y + position.y < clickY
		);
	}
	drag(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}
	resize(dx: number, dy: number): void {
		throw new Error('Method not implemented.');
	}

	load(config: { x: number; y: number; width: number; height: number; color: string }) {
		this.x = config.x;
		this.y = config.y;
		this.width = config.width;
		this.height = config.height;
		this.color = config.color;
	}

	toJSON() {
		return {
			type: 'rectangle' as const,
			x: this.x,
			y: this.y,
			width: this.width,
			height: this.height,
			color: this.color
		};
	}

	static create(
		ev: MouseEvent | TouchEvent,
		camera: Position,
		color: string,
		render: () => void,
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement
	) {
		const newRect = new Rectangle();

		const isTouch = ev instanceof TouchEvent;
		const pos = getPosFromEvent(ev);

		newRect.x = pos.x - camera.x;
		newRect.y = pos.y - camera.y;
		newRect.color = color;

		const startX = pos.x;
		const startY = pos.y;

		let frame: number | undefined;
		let lastPos = pos;

		const drag = (ev: MouseEvent | TouchEvent) => {
			ev.preventDefault();
			const newPos = getPosFromEvent(ev);
			const dx = newPos.x - lastPos.x;
			const dy = newPos.y - lastPos.y;
			lastPos = newPos;

			if (newPos.x < startX) {
				newRect.width -= dx;
				newRect.x += dx;
			} else {
				newRect.width += dx;
			}

			if (newPos.y < startY) {
				newRect.height -= dy;
				newRect.y += dy;
			} else {
				newRect.height += dy;
			}

			if (frame) cancelAnimationFrame(frame);
			render();
			newRect.render(camera, ctx as CanvasRenderingContext2D);
		};

		return new Promise<CanvasElement>((res) => {
			const off = on(canvas, isTouch ? 'touchmove' : 'mousemove', drag);
			on(
				canvas,
				isTouch ? 'touchend' : 'mouseup',
				() => {
					off();
					res(newRect);
				},
				{ once: true }
			);
		});
	}
}
