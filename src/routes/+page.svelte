<script lang="ts">
	import { CanvasRenderer } from '$lib/canvas.svelte';

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
></canvas>
<div class="controls">
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
