import type { Mouse } from "@playwright/test";

class Position {
    x = $state(0);
    y = $state(0);
    zoom = $state(1);
}

const drawSelectionFrame = (startPoint: Point, width: number, height: number, position: Position, ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#00f';
    ctx.lineWidth = 2;
    ctx.strokeRect(startPoint.x + position.x - 2, startPoint.y + position.y - 2, width + 4, height + 4)
}

abstract class CanvasElement {
    selected: boolean = $state(false);
    color: string = $derived('#000');
    lineWidth = $state(1);

    abstract render(position: Position, ctx: CanvasRenderingContext2D): void;
    abstract isOnScreen(position: Position, width: number, height: number): boolean;
    abstract checkClick(clickX: number, clickY: number, position: Position): boolean;
    abstract drag(dx: number, dy: number): void;
    abstract resize(dx: number, dy: number): void;
}

export class Rectangle extends CanvasElement {
    x: number = $state(0);
    y: number = $state(0);

    width: number = $state(0);
    height: number = $state(0)

    render(position: Position, ctx: CanvasRenderingContext2D): void {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.strokeRect(this.x + position.x, this.y + position.y, this.width, this.height);
        if (this.selected) drawSelectionFrame({ x: this.x, y: this.y }, this.width, this.height, position, ctx)
    }
    isOnScreen(position: Position, width: number, height: number): boolean {
        return this.x + this.width + position.x > 0 && this.y + this.height + position.y > 0 && this.x + position.x < width && this.y + position.y < height
    }
    checkClick(clickX: number, clickY: number, position: Position): boolean {
        return this.x + this.width + position.x > clickX && this.y + this.height + position.y > clickY && this.x + position.x < clickX && this.y + position.y < clickY
    }
    drag(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }
    resize(dx: number, dy: number): void {
        throw new Error("Method not implemented.");
    }
}

type Point = { x: number, y: number; }

export class FreeDraw extends CanvasElement {
    start: Point = $state({ x: 0, y: 0 })
    points: Point[] = $state([]);

    minX = $state(0);
    minY = $state(0);
    maxX = $state(0);
    maxY = $state(0);

    parsePoint(point: Point, position?: Position, reversPosition: 1 | -1 = 1) {
        return {
            x: point.x + this.start.x + (position?.x ?? 0) * reversPosition,
            y: point.y + this.start.y + (position?.y ?? 0) * reversPosition
        }
    }

    addPoint(point: Point, ctx: CanvasRenderingContext2D, position: Position) {
        const prevPoint = this.points[this.points.length - 1]
        this.points.push(point);
        if (!prevPoint) return;

        const prevPointParsed = this.parsePoint(prevPoint, position);
        const currentPointParsed = this.parsePoint(point, position);
        ctx.lineWidth = this.lineWidth
        ctx.strokeStyle = this.color;
        ctx.moveTo(prevPointParsed.x, prevPointParsed.y);
        ctx.lineTo(currentPointParsed.x, currentPointParsed.y)
        ctx.stroke();
    }

    render(position: Position, ctx: CanvasRenderingContext2D): void {
        ctx.lineWidth = this.lineWidth
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        this.points.forEach((point, i) => {
            const parsedPoint = this.parsePoint(point, position)
            if (i === 0) {
                ctx.moveTo(parsedPoint.x, parsedPoint.y);
                return;
            }
            ctx.lineTo(parsedPoint.x, parsedPoint.y)
        })
        ctx.stroke();
        if (this.selected) {
            const minPoint = this.parsePoint({ x: this.minX, y: this.minY });
            const maxPoint = this.parsePoint({ x: this.maxX, y: this.maxY });
            drawSelectionFrame({ x: minPoint.x, y: minPoint.y }, maxPoint.x - minPoint.x, maxPoint.y - minPoint.y, position, ctx)
        }
    }

    isOnScreen(position: Position, width: number, height: number): boolean {
        const minPoint = this.parsePoint({ x: this.minX, y: this.minY }, position);
        const maxPoint = this.parsePoint({ x: this.maxX, y: this.maxY }, position);
        return maxPoint.x > 0 && maxPoint.y > 0 && minPoint.x < width && minPoint.y < height
    }
    checkClick(clickX: number, clickY: number, position: Position): boolean {
        const minPoint = this.parsePoint({ x: this.minX, y: this.minY }, position);
        const maxPoint = this.parsePoint({ x: this.maxX, y: this.maxY }, position);
        return maxPoint.x > clickX && maxPoint.y > clickY && minPoint.x < clickX && minPoint.y < clickY
    }
    drag(dx: number, dy: number): void {
        this.start.x += dx;
        this.start.y += dy;
    }
    resize(dx: number, dy: number): void {
        throw new Error("Method not implemented.");
    }

}

export type Mode = 'select' | 'drag' | 'rect' | 'freedraw'

const getPosFromEvent = (ev: MouseEvent | TouchEvent) => {
    return ev instanceof MouseEvent ? { x: ev.offsetX, y: ev.offsetY } : { x: ev.targetTouches[0].clientX, y: ev.targetTouches[0].clientY }
}

export class CanvasRenderer {
    canvas: HTMLCanvasElement | undefined = $state();
    ctx: CanvasRenderingContext2D | undefined = $derived(this.canvas?.getContext('2d') ?? undefined)
    width: number = $state(0);
    height: number = $state(0);
    position = $state(new Position());
    elements: CanvasElement[] = $state([])
    visibleElements = $derived(this.elements.filter(element => element.isOnScreen(this.position, this.width, this.height)))
    selectedElement: CanvasElement | undefined = $state();
    mode: Mode = $state('rect')

    constructor() {
        $effect.root(() => {
            let animationRequested: number | undefined;

            $effect(() => {
                if (!this.ctx) return;

                if (this.position.x === undefined || this.position.y === undefined) return;

                this.render();
            })
        })
    }

    #createRect(ev: MouseEvent | TouchEvent) {
        const newRect = new Rectangle();

        const isTouch = ev instanceof TouchEvent;
        const pos = getPosFromEvent(ev)

        newRect.x = pos.x - this.position.x;
        newRect.y = pos.y - this.position.y;

        const startX = pos.x;
        const startY = pos.y;

        let frame: number | undefined;
        let lastPos = pos;

        const drag = (ev: MouseEvent | TouchEvent) => {
            ev.preventDefault()
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
        }

        this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
        this.canvas?.addEventListener(isTouch ? 'touchend' : 'mouseup', () => {
            this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
            this.elements.push(newRect);
        }, { once: true })
    }

    #createFreedraw(ev: MouseEvent | TouchEvent) {

        const isTouch = ev instanceof TouchEvent;
        const startPos = getPosFromEvent(ev);

        const newFreedraw = new FreeDraw()

        newFreedraw.start.x = startPos.x - this.position.x;
        newFreedraw.start.y = startPos.y - this.position.y;
        newFreedraw.minX = 0;
        newFreedraw.maxX = 0;
        newFreedraw.minY = 0;
        newFreedraw.maxY = 0;

        let lastPoint = { x: 0, y: 0 }
        let lastPos = startPos;
        newFreedraw.addPoint(lastPoint, this.ctx as CanvasRenderingContext2D, this.position);
        const drag = (ev: MouseEvent | TouchEvent) => {
            ev.preventDefault()
            const newPos = getPosFromEvent(ev);
            const dx = newPos.x - lastPos.x;
            const dy = newPos.y - lastPos.y;
            lastPos = newPos;

            let point = { x: lastPoint.x + dx, y: lastPoint.y + dy }
            lastPoint = point
            newFreedraw.addPoint(point, this.ctx as CanvasRenderingContext2D, this.position)

            newFreedraw.minX = Math.min(point.x, newFreedraw.minX);
            newFreedraw.minY = Math.min(point.y, newFreedraw.minY);

            newFreedraw.maxX = Math.max(point.x, newFreedraw.maxX);
            newFreedraw.maxY = Math.max(point.y, newFreedraw.maxY);
        }

        this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
        this.canvas?.addEventListener(isTouch ? 'touchend' : 'mouseup', () => {
            this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
            this.elements.push(newFreedraw);
        }, { once: true })

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
        }

        this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);

        this.canvas?.addEventListener(isTouch ? 'touchend' : 'mouseup', () => {
            this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
        }, { once: true })
    }

    #selection(ev: MouseEvent | TouchEvent) {
        const isTouch = ev instanceof TouchEvent;
        let lastPos = getPosFromEvent(ev);

        if (this.selectedElement) this.selectedElement.selected = false;
        this.selectedElement = this.visibleElements.findLast((element) => element.checkClick(lastPos.x, lastPos.y, this.position))
        if (this.selectedElement) this.selectedElement.selected = true;

        if (this.selectedElement) {
            const drag = (ev: MouseEvent | TouchEvent) => {
                ev.preventDefault();
                if (!this.selectedElement) return;
                const newPos = getPosFromEvent(ev);
                const dx = newPos.x - lastPos.x;
                const dy = newPos.y - lastPos.y;
                lastPos = newPos;
                this.selectedElement.drag(dx, dy)
            }
            this.canvas?.addEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
            this.canvas?.addEventListener(isTouch ? 'touchend' : 'mouseup', () => {
                this.canvas?.removeEventListener(isTouch ? 'touchmove' : 'mousemove', drag);
            }, { once: true })
            return
        }
    }

    click(ev: MouseEvent | TouchEvent) {
        switch (this.mode) {
            case 'rect':
                this.#createRect(ev);
                break;
            case "select":
                this.#selection(ev);
                break;
            case "drag":
                this.#dragCanvas(ev);
                break;
            case "freedraw":
                this.#createFreedraw(ev)
                break;
        }
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height)

        this.ctx.fillStyle = 'red'
        this.ctx.fillRect(this.position.x, this.position.y, 20, 20)
        this.visibleElements.forEach((element) => {
            element.render(this.position, this.ctx as CanvasRenderingContext2D);
        })
    }

}