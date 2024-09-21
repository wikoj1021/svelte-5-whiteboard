<script lang="ts">
	import { CanvasRenderer } from '$lib/canvas.svelte';
	import ColorPicker from '$lib/ColorPicker.svelte';

	let canvas: HTMLCanvasElement | undefined = $state();
	let renderer = new CanvasRenderer();

	$effect(() => {
		renderer.canvas = canvas;
	});
</script>

<canvas
	bind:this={canvas}
	bind:offsetWidth={renderer.width}
	bind:offsetHeight={renderer.height}
	width={renderer.width}
	height={renderer.height}
	onmousedown={(ev) => renderer.click(ev)}
	ontouchstart={(ev) => renderer.click(ev)}
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
<div class="controls">
	<button popovertarget="picker">picker</button>
	<button class:selected={renderer.mode === 'rect'} onclick={() => (renderer.mode = 'rect')}>
		rect
	</button>
	<button class:selected={renderer.mode === 'drag'} onclick={() => (renderer.mode = 'drag')}>
		drag
	</button>
	<button
		class:selected={renderer.mode === 'freedraw'}
		onclick={() => (renderer.mode = 'freedraw')}
	>
		freedraw
	</button>
	<button class:selected={renderer.mode === 'select'} onclick={() => (renderer.mode = 'select')}>
		select
	</button>
	<button class:selected={renderer.mode === 'erase'} onclick={() => (renderer.mode = 'erase')}>
		erase
	</button>
	<button disabled={renderer.historyPosition <= 0} onclick={() => renderer.undo()}>undo</button>
	<button
		disabled={renderer.historyPosition >= renderer.history.length}
		onclick={() => renderer.redo()}
	>
		redo
	</button>
	<button onclick={() => renderer.save()}> save </button>
	<input type="file" onchange={(ev) => renderer.load(ev)} />
</div>

<style>
	.selected {
		background-color: red;
	}
	.controls {
		position: absolute;
		top: 0;
		left: 0;
	}

	canvas {
		width: 100vw;
		height: 100vh;
	}
</style>
