import { getPosFromEvent } from './helpers';
import type { CanvasElement } from './shapes/abstract.svelte';
import type { HistoryEntry, Mode } from './types';
import shapes from './shapes';
import type { FreeDraw } from './shapes/freeDraw.svelte';
import { History } from './history.svelte';

export class Position {
	x = $state(0);
	y = $state(0);
	zoom = $state(1);
}

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
	#mode: Mode = $state('create');
	currentColor = $state('hwb(0 0% 100%)');
	#selectedShape: keyof typeof shapes | undefined = $state('rectangle');
    history = new History();

	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (!this.ctx) return;

				if (this.position.x === undefined || this.position.y === undefined) return;

				this.render();
			});
		});
	}

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

	get selectedShape() {
		if (this.#mode !== 'create') return undefined;
		return this.#selectedShape;
	}

	set selectedShape(shape: keyof typeof shapes | undefined) {
		this.#mode = 'create';
		this.#selectedShape = shape;
	}

	undo() {
        const entry = this.history.undo();
        if(!entry) return;
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
        const entry = this.history.redo();
        if(!entry) return;

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
						this.history.append({
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
					this.history.append({
						action: 'delete',
						detail: {
							elements: removedElements
						}
					});
			},
			{ once: true }
		);
	}

	zoom(ev: WheelEvent) {
		if (ev.deltaY < 0) {
			this.position.zoom *= (Math.abs(ev.deltaY) / 100) * 1.1;
		} else {
			this.position.zoom /= (Math.abs(ev.deltaY) / 100) * 1.1;
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

		const elements = JSON.parse(await file.text()) as ReturnType<
			InstanceType<(typeof shapes)[keyof typeof shapes]>['toJSON']
		>[];

		this.position = { x: 0, y: 0, zoom: 1 };
		this.currentColor = 'hwb(0 0% 100%)';
		this.history.clear();
		this.#mode = 'create';
		this.#selectedShape = 'rectangle';
		this.elements = elements.map((element) => {
			const elem = new shapes[element.type]() as FreeDraw;
			elem.load(element as ReturnType<InstanceType<(typeof shapes)['freeDraw']>['toJSON']>);
			return elem;
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

	click(ev: MouseEvent | TouchEvent) {
		switch (this.mode) {
			case 'create':
				if (!this.ctx || !this.canvas) {
					throw Error('Cannot create element due to error');
				}
				if (!this.selectedShape) {
					throw Error('Shape not selected');
				}
				shapes[this.selectedShape]
					.create(ev, this.position, this.currentColor, ()=>this.render(), this.ctx, this.canvas)
					.then((elem) => {
						this.elements.push(elem);
						this.history.append({
							action: 'create',
							detail: {
								element: elem
							}
						});
					});
				break;
			case 'select':
				this.#selection(ev);
				break;
			case 'drag':
				this.#dragCanvas(ev);
				break;
            case 'erase':
                this.#erase(ev);
                break;
		}
	}
}
