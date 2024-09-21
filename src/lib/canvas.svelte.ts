class Position {
	x = $state(0);
	y = $state(0);
	zoom = $state(1);
}

const drawSelectionFrame = (
	startPoint: Point,
	width: number,
	height: number,
	position: Position,
	ctx: CanvasRenderingContext2D
) => {
	ctx.strokeStyle = '#00f';
	ctx.lineWidth = 2;
	ctx.strokeRect(
		startPoint.x + position.x - 2,
		startPoint.y + position.y - 2,
		width + 4,
		height + 4
	);
};

abstract class CanvasElement {
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
			type: 'rectangle',
			x: this.x,
			y: this.y,
			width: this.width,
			height: this.height,
			color: this.color
		};
	}
}

type Point = { x: number; y: number };

export class FreeDraw extends CanvasElement {
	start: Point = $state({ x: 0, y: 0 });
	points: Point[] = $state([]);

	minX = $state(0);
	minY = $state(0);
	maxX = $state(0);
	maxY = $state(0);

	parsePoint(point: Point, position?: Position, reversPosition: 1 | -1 = 1) {
		return {
			x: point.x + this.start.x + (position?.x ?? 0) * reversPosition,
			y: point.y + this.start.y + (position?.y ?? 0) * reversPosition
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
			type: 'freedraw',
			start: this.start,
			points: this.points,
			minX: this.minX,
			minY: this.minY,
			maxX: this.maxX,
			maxY: this.maxY,
			color: this.color
		};
	}
}

export type Mode = 'select' | 'drag' | 'rect' | 'freedraw' | 'erase';

const getPosFromEvent = (ev: MouseEvent | TouchEvent) => {
	return ev instanceof MouseEvent
		? { x: ev.offsetX, y: ev.offsetY }
		: { x: ev.targetTouches[0].clientX, y: ev.targetTouches[0].clientY };
};

type HistoryEntry =
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

export class CanvasRenderer {
	canvas: HTMLCanvasElement | undefined = $state();
	ctx: CanvasRenderingContext2D | undefined = $derived(this.canvas?.getContext('2d') ?? undefined);
	width: number = $state(0);
	height: number = $state(0);
	position = $state(new Position());
	elements: CanvasElement[] = $state([]);
	visibleElements = $derived(
		this.elements.filter((element) => element.isOnScreen(this.position, this.width, this.height))
	);
	selectedElement: CanvasElement | undefined = $state();
	#mode: Mode = $state('rect');
	history: HistoryEntry[] = $state([]);
	historyPosition = $state(0);
	currentColor = $state('hwb(0 0% 100%)');

	set mode(mode: Mode) {
		if (mode !== 'select') {
			if (this.selectedElement) this.selectedElement.selected = false;
			this.selectedElement = undefined;
		}
		this.#mode = mode;
	}

	get mode() {
		return this.#mode;
	}

	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (!this.ctx) return;

				if (this.position.x === undefined || this.position.y === undefined) return;

				this.render();
			});
		});
	}

	addHistoryEntry(entry: HistoryEntry) {
		if (this.historyPosition <= this.history.length) this.history.splice(this.historyPosition);
		this.history.push(entry);
		this.historyPosition++;
	}

	undo() {
		if (this.historyPosition <= 0) return;
		this.historyPosition--;
		const entry = this.history[this.historyPosition];

		switch (entry.action) {
			case 'create':
				this.elements.pop();
				break;
			case 'delete':
				this.elements.push(...entry.detail.elements);
				break;
			case 'move':
				entry.detail.element.drag(
					-(entry.detail.positionChange?.x ?? 0),
					-(entry.detail.positionChange?.y ?? 0)
				);
				break;
		}
	}

	redo() {
		if (this.historyPosition >= this.history.length) return;
		const entry = this.history[this.historyPosition];
		this.historyPosition++;

		switch (entry.action) {
			case 'create':
				this.elements.push(entry.detail.element);
				break;
			case 'delete':
				this.elements.splice(this.elements.length - entry.detail.elements.length);
				break;
			case 'move':
				entry.detail.element.drag(
					entry.detail.positionChange?.x ?? 0,
					entry.detail.positionChange?.y ?? 0
				);
				break;
		}
	}

	#createRect(ev: MouseEvent | TouchEvent) {
		const newRect = new Rectangle();

		const isTouch = ev instanceof TouchEvent;
		const pos = getPosFromEvent(ev);

		newRect.x = pos.x - this.position.x;
		newRect.y = pos.y - this.position.y;
		newRect.color = this.currentColor;

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
			this.render();
			newRect.render(this.position, this.ctx as CanvasRenderingContext2D);
		};

		this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
		this.canvas?.addEventListener(
			isTouch ? 'touchend' : 'mouseup',
			() => {
				this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
				this.elements.push(newRect);
				this.addHistoryEntry({
					action: 'create',
					detail: {
						element: newRect
					}
				});
			},
			{ once: true }
		);
	}

	#createFreedraw(ev: MouseEvent | TouchEvent) {
		const isTouch = ev instanceof TouchEvent;
		const startPos = getPosFromEvent(ev);

		const newFreedraw = new FreeDraw();

		newFreedraw.start.x = startPos.x - this.position.x;
		newFreedraw.start.y = startPos.y - this.position.y;
		newFreedraw.minX = 0;
		newFreedraw.maxX = 0;
		newFreedraw.minY = 0;
		newFreedraw.maxY = 0;
		newFreedraw.color = this.currentColor;

		let lastPoint = { x: 0, y: 0 };
		let lastPos = startPos;
		newFreedraw.addPoint(lastPoint, this.ctx as CanvasRenderingContext2D, this.position);
		const drag = (ev: MouseEvent | TouchEvent) => {
			ev.preventDefault();
			const newPos = getPosFromEvent(ev);
			const dx = newPos.x - lastPos.x;
			const dy = newPos.y - lastPos.y;
			lastPos = newPos;

			const point = { x: lastPoint.x + dx, y: lastPoint.y + dy };
			lastPoint = point;
			newFreedraw.addPoint(point, this.ctx as CanvasRenderingContext2D, this.position);

			newFreedraw.minX = Math.min(point.x, newFreedraw.minX);
			newFreedraw.minY = Math.min(point.y, newFreedraw.minY);

			newFreedraw.maxX = Math.max(point.x, newFreedraw.maxX);
			newFreedraw.maxY = Math.max(point.y, newFreedraw.maxY);
		};

		this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
		this.canvas?.addEventListener(
			isTouch ? 'touchend' : 'mouseup',
			() => {
				this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
				this.elements.push(newFreedraw);
				this.addHistoryEntry({
					action: 'create',
					detail: {
						element: newFreedraw
					}
				});
			},
			{ once: true }
		);
	}

	#dragCanvas(ev: MouseEvent | TouchEvent) {
		const isTouch = ev instanceof TouchEvent;

		let lastPos = getPosFromEvent(ev);
		const drag = (ev: MouseEvent | TouchEvent) => {
			ev.preventDefault();
			const newPos = getPosFromEvent(ev);
			const dx = newPos.x - lastPos.x;
			const dy = newPos.y - lastPos.y;
			lastPos = newPos;
			this.position.x += dx;
			this.position.y += dy;
		};

		this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);

		this.canvas?.addEventListener(
			isTouch ? 'touchend' : 'mouseup',
			() => {
				this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
			},
			{ once: true }
		);
	}

	#selection(ev: MouseEvent | TouchEvent) {
		const isTouch = ev instanceof TouchEvent;
		const firstPos = getPosFromEvent(ev);
		let lastPos = firstPos;

		if (this.selectedElement) this.selectedElement.selected = false;
		this.selectedElement = this.visibleElements.findLast((element) =>
			element.checkClick(lastPos.x, lastPos.y, this.position)
		);
		if (this.selectedElement) this.selectedElement.selected = true;

		if (this.selectedElement) {
			const drag = (ev: MouseEvent | TouchEvent) => {
				ev.preventDefault();
				if (!this.selectedElement) return;
				const newPos = getPosFromEvent(ev);
				const dx = newPos.x - lastPos.x;
				const dy = newPos.y - lastPos.y;
				lastPos = newPos;
				this.selectedElement.drag(dx, dy);
			};
			this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
			this.canvas?.addEventListener(
				isTouch ? 'touchend' : 'mouseup',
				(ev) => {
					const endPos = getPosFromEvent(ev);
					this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
					const positionChange = {
						x: endPos.x - firstPos.x,
						y: endPos.y - firstPos.y
					};

					if (positionChange.x > 0 || positionChange.y > 0)
						this.addHistoryEntry({
							action: 'move',
							detail: {
								element: this.selectedElement as CanvasElement,
								positionChange
							}
						});
				},
				{ once: true }
			);
			return;
		}
	}

	#erase(ev: MouseEvent | TouchEvent) {
		const pos = getPosFromEvent(ev);
		const isTouch = ev instanceof TouchEvent;

		const removedElements: CanvasElement[] = [];

		this.elements = this.elements.filter((el) => {
			const keep =
				!el.isOnScreen(this.position, this.width, this.height) ||
				!el.checkClick(pos.x, pos.y, this.position);
			if (!keep) removedElements.push(el);
			return keep;
		});

		const drag = (ev: MouseEvent | TouchEvent) => {
			ev.preventDefault();
			const pos = getPosFromEvent(ev);
			this.elements = this.elements.filter((el) => {
				const keep =
					!el.isOnScreen(this.position, this.width, this.height) ||
					!el.checkClick(pos.x, pos.y, this.position);
				if (!keep) removedElements.push(el);
				return keep;
			});
		};

		this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);

		this.canvas?.addEventListener(
			isTouch ? 'touchend' : 'mouseup',
			() => {
				this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
				if (removedElements.length)
					this.addHistoryEntry({
						action: 'delete',
						detail: {
							elements: removedElements
						}
					});
			},
			{ once: true }
		);
	}

	click(ev: MouseEvent | TouchEvent) {
		switch (this.#mode) {
			case 'rect':
				this.#createRect(ev);
				break;
			case 'select':
				this.#selection(ev);
				break;
			case 'drag':
				this.#dragCanvas(ev);
				break;
			case 'freedraw':
				this.#createFreedraw(ev);
				break;
			case 'erase':
				this.#erase(ev);
				break;
		}
	}

	render() {
		if (!this.ctx) return;
		this.ctx.clearRect(0, 0, this.width, this.height);
		this.visibleElements.forEach((element) => {
			element.render(this.position, this.ctx as CanvasRenderingContext2D);
		});
	}

	async load(
		ev: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) {
		const file = ev.currentTarget.files?.[0];
		if (!file) {
			console.error('No file');
			return;
		}

		const elements = JSON.parse(await file.text());

		this.position = { x: 0, y: 0, zoom: 1 };
		this.currentColor = 'hwb(0 0% 100%)';
		this.history = [];
		this.historyPosition = 0;
		this.#mode = 'rect';
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.elements = elements.map((element: any) => {
			if (element.type === 'rectangle') {
				const elem = new Rectangle();
				elem.load(element);
				return elem;
			}

			if (element.type === 'freedraw') {
				const elem = new FreeDraw();
				elem.load(element);
				return elem;
			}
		});
	}

	save() {
		const a = document.createElement('a');
		const content = new Blob([JSON.stringify(this.elements)], { type: 'application/json' });
		const url = URL.createObjectURL(content);
		a.setAttribute('href', url);
		a.setAttribute('download', 'data');
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}
