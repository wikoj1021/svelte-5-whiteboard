import type { Position } from '$lib/canvas.svelte';
import { drawSelectionFrame, getPosFromEvent } from '$lib/helpers';
import type { Point } from '$lib/types';
import { on } from 'svelte/events';
import { CanvasElement } from './abstract.svelte';

export class FreeDraw extends CanvasElement {
	start: Point = $state({ x: 0, y: 0 });
	points: Point[] = $state([]);

	minX = $state(0);
	minY = $state(0);
	maxX = $state(0);
	maxY = $state(0);

	parsePoint(point: Point, position?: Position, reversePosition: 1 | -1 = 1) {
		return {
			x: point.x + this.start.x + (position?.x ?? 0) * reversePosition,
			y: point.y + this.start.y + (position?.y ?? 0) * reversePosition
		};
	}

	addPoint(point: Point, ctx: CanvasRenderingContext2D, position: Position) {
		const prevPoint = this.points[this.points.length - 1];
		this.points.push(point);
		if (!prevPoint) return;

		const prevPointParsed = this.parsePoint(prevPoint, position);
		const currentPointParsed = this.parsePoint(point, position);
		ctx.lineWidth = this.lineWidth;
		ctx.strokeStyle = this.color;
		ctx.beginPath();
		ctx.moveTo(prevPointParsed.x, prevPointParsed.y);
		ctx.lineTo(currentPointParsed.x, currentPointParsed.y);
		ctx.stroke();
	}

	render(position: Position, ctx: CanvasRenderingContext2D): void {
		ctx.lineWidth = this.lineWidth;
		ctx.strokeStyle = this.color;
		ctx.beginPath();
		this.points.forEach((point, i) => {
			const parsedPoint = this.parsePoint(point, position);
			if (i === 0) {
				ctx.moveTo(parsedPoint.x, parsedPoint.y);
				return;
			}
			ctx.lineTo(parsedPoint.x, parsedPoint.y);
		});
		ctx.stroke();
		if (this.selected) {
			const minPoint = this.parsePoint({ x: this.minX, y: this.minY });
			const maxPoint = this.parsePoint({ x: this.maxX, y: this.maxY });
			drawSelectionFrame(
				{ x: minPoint.x, y: minPoint.y },
				maxPoint.x - minPoint.x,
				maxPoint.y - minPoint.y,
				position,
				ctx
			);
		}
	}

	isOnScreen(position: Position, width: number, height: number): boolean {
		const minPoint = this.parsePoint({ x: this.minX, y: this.minY }, position);
		const maxPoint = this.parsePoint({ x: this.maxX, y: this.maxY }, position);
		return maxPoint.x > 0 && maxPoint.y > 0 && minPoint.x < width && minPoint.y < height;
	}
	checkClick(clickX: number, clickY: number, position: Position): boolean {
		const minPoint = this.parsePoint({ x: this.minX, y: this.minY }, position);
		const maxPoint = this.parsePoint({ x: this.maxX, y: this.maxY }, position);
		return maxPoint.x > clickX && maxPoint.y > clickY && minPoint.x < clickX && minPoint.y < clickY;
	}
	drag(dx: number, dy: number): void {
		this.start.x += dx;
		this.start.y += dy;
	}
	resize(dx: number, dy: number): void {
		throw new Error('Method not implemented.');
	}

	load(config: {
		start: Point;
		points: Point[];
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
		color: string;
	}) {
		this.start = config.start;
		this.points = config.points;
		this.maxX = config.maxX;
		this.maxY = config.maxY;
		this.minX = config.minX;
		this.minY = config.minY;
		this.color = config.color;
	}

	toJSON() {
		return {
			type: 'freeDraw' as const,
			start: this.start,
			points: this.points,
			minX: this.minX,
			minY: this.minY,
			maxX: this.maxX,
			maxY: this.maxY,
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
		const isTouch = ev instanceof TouchEvent;
		const startPos = getPosFromEvent(ev, camera);

		const newFreedraw = new FreeDraw();

		newFreedraw.start.x = startPos.x;
		newFreedraw.start.y = startPos.y;
		newFreedraw.minX = 0;
		newFreedraw.maxX = 0;
		newFreedraw.minY = 0;
		newFreedraw.maxY = 0;
		newFreedraw.color = color;

		let lastPoint = { x: 0, y: 0 };
		let lastPos = startPos;
		newFreedraw.addPoint(lastPoint, ctx as CanvasRenderingContext2D, camera);
		const drag = (ev: MouseEvent | TouchEvent) => {
			ev.preventDefault();
			const newPos = getPosFromEvent(ev);
			const dx = newPos.x - lastPos.x;
			const dy = newPos.y - lastPos.y;
			lastPos = newPos;

			const point = { x: lastPoint.x + dx, y: lastPoint.y + dy };
			lastPoint = point;
			newFreedraw.addPoint(point, ctx as CanvasRenderingContext2D, camera);

			newFreedraw.minX = Math.min(point.x, newFreedraw.minX);
			newFreedraw.minY = Math.min(point.y, newFreedraw.minY);

			newFreedraw.maxX = Math.max(point.x, newFreedraw.maxX);
			newFreedraw.maxY = Math.max(point.y, newFreedraw.maxY);
		};

		return new Promise<CanvasElement>((res) => {
			const off = on(canvas, isTouch ? 'touchmove' : 'mousemove', drag);
			on(canvas, isTouch ? 'touchend' : 'mouseup', () => {
				off();
				res(newFreedraw);
			});
		});
	}
}
