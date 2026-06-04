import type { Position } from "./canvas.svelte";
import type { Point } from "./types";

export const getPosFromEvent = (ev: MouseEvent | TouchEvent, camera?: Position) => {
    return ev instanceof MouseEvent ? { 
        x: ev.offsetX - (camera?.x ?? 0), 
        y: ev.offsetY - (camera?.y ?? 0) 
    } : { 
        x: ev.targetTouches[0].clientX - (camera?.x ?? 0),
        y: ev.targetTouches[0].clientY - (camera?.y ?? 0)
    }
}

export const drawSelectionFrame = (startPoint: Point, width: number, height: number, position: Position, ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#00f';
    ctx.lineWidth = 2;
    ctx.strokeRect(startPoint.x + position.x - 2, startPoint.y + position.y - 2, width + 4, height + 4)
}