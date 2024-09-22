<script lang="ts">
	import { CanvasRenderer } from '$lib/canvas.svelte';
	import ColorPicker from '$lib/ColorPicker.svelte';

	let canvas: HTMLCanvasElement | undefined = $state();
	let renderer = new CanvasRenderer();

	$effect(() => {
		renderer.canvas = canvas;
	});

	$inspect(renderer.position.zoom);

	const modes = ['rect', 'freedraw', 'erase', 'drag', 'select'];

	let position = $derived(modes.findIndex((mode) => mode === renderer.mode));
	$inspect(position);
</script>

<canvas
	bind:this={canvas}
	bind:offsetWidth={renderer.width}
	bind:offsetHeight={renderer.height}
	width={renderer.width}
	height={renderer.height}
	onmousedown={(ev) => renderer.click(ev)}
	ontouchstart={(ev) => renderer.click(ev)}
	onwheel={(ev) => renderer.zoom(ev)}
></canvas>

<div popover="auto" id="picker">
	<ColorPicker
		onchange={(color) => {
			if (!renderer.selectedElement) {
				renderer.currentColor = color;
				return;
			}
			renderer.selectedElement.color = color;
		}}
		value={renderer.selectedElement?.color ?? renderer.currentColor}
	/>
</div>

<div class="controls-bottom">
	<button popovertarget="picker" aria-label="color-picker" class="picker">
		<div
			class="picker-preview"
			style:background-color={renderer.selectedElement?.color ?? renderer.currentColor}
		></div>
	</button>
	<div style:width="12px"></div>
	<div class="tools">
		<button onclick={() => (renderer.mode = 'rect')}>
			<svg width="24" height="24" viewBox="0 0 24 24">
				<rect x="2" y="2" width="20" height="20" fill="none" stroke="black" stroke-width="2"></rect>
			</svg>
		</button>
		<button onclick={() => (renderer.mode = 'freedraw')}>
			<img src="/icons/draw.svg" alt="draw" />
		</button>
		<button onclick={() => (renderer.mode = 'erase')}>
			<img src="/icons/ink_eraser.svg" alt="delete" />
		</button>
		<button onclick={() => (renderer.mode = 'drag')}>
			<img src="/icons/drag_pan.svg" alt="pan" />
		</button>
		<button onclick={() => (renderer.mode = 'select')}>
			<img src="/icons/arrow_selector_tool.svg" alt="draw" />
		</button>
		<div style:width="12px"></div>
		<button disabled={renderer.historyPosition <= 0} onclick={() => renderer.undo()}>
			<img src="/icons/undo.svg" alt="delete" />
		</button>
		<button
			disabled={renderer.historyPosition >= renderer.history.length}
			onclick={() => renderer.redo()}
		>
			<img src="/icons/redo.svg" alt="delete" />
		</button>
		<div class="selected" style:left="{position * 32}px"></div>
	</div>
	<div style:width="12px"></div>
	<button onclick={() => renderer.save()}>
		<img src="/icons/save.svg" alt="delete" />
	</button>
	<label for="load-file" class="load-file">
		<img src="/icons/upload_file.svg" alt="delete" />
	</label>
	<input id="load-file" type="file" onchange={(ev) => renderer.load(ev)} />
</div>

<style>
	.selected {
		background-color: #e1b900;
		border-radius: 5px 5px 0 0;
		position: absolute;
		width: 24px;
		height: 24px;
		left: 0;
		top: 0;
		padding: 4px;
		transition: left ease-out 250ms;
	}

	.tools {
		display: flex;
		position: relative;
	}

	.controls-bottom {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #d1d0d0;
		flex-wrap: nowrap;
		border-radius: 5px 5px 0 0;
	}

	canvas {
		width: 100vw;
		height: 100vh;
	}

	#load-file {
		display: none;
	}

	.load-file {
		cursor: pointer;
	}

	button,
	label {
		all: unset;
		cursor: pointer;
		padding: 4px;
		width: 24px;
		height: 24px;
		z-index: 1;
	}

	button:disabled {
		cursor: not-allowed;
	}

	.picker-preview {
		width: 23px;
		height: 23px;
		border-radius: 5px;
		border: 1px solid black;
	}
</style>
