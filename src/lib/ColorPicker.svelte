<script lang="ts">
	import { slide } from 'svelte/transition';

	let {
		value = $bindable(),
		onchange
	}: {
		value?: string;
		onchange?: (value: string) => void;
	} = $props();

	let hue = $state(0);
	let white = $state(0);
	let black = $state(0);
	let sliderWidth = $state(0);
	let sliderActive = $state(false);
	let pickerActive = $state(false);
	let pickerWidth = $state(0);
	let pickerHeight = $state(0);

	const HWB_REGEX = /^hwb\((\d+(?:\.\d*)?)\s*,?\s*(\d*(?:\.\d*)?)%\s*,?\s*(\d*(?:\.\d*)?)%\s*\)$/;

	$effect(() => {
		const match = value?.match(HWB_REGEX);
		if (!match) {
			console.error('Invalid color provide color in hwb');
			return;
		}
		hue = Number(match[1]);
		white = Number(match[2]);
		black = Number(match[3]);
	});

	const changeHue = (ev: MouseEvent, start: boolean, applyHue: boolean = true) => {
		if (applyHue) hue = Math.round((ev.layerX / sliderWidth) * 360);
		sliderActive = start;

		onchange?.(`hwb(${hue} ${white}% ${black}%)`);
	};

	const updatePicker = (ev: MouseEvent, start: boolean, applyValues: boolean = true) => {
		if (applyValues) {
			black = (ev.layerY / pickerHeight) * 100;
			white = (1 - ev.layerX / pickerWidth) * (100 - black);
		}
		onchange?.(`hwb(${hue} ${white}% ${black}%)`);
		pickerActive = start;
	};
</script>

<div style:--hue={hue} class="wrapper">
	<div class="picker">
		<div
			class="picker-circle"
			style:right="{(white / (100 - black)) * 100}%"
			style:top="{black}%"
		></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="picker-handler"
			onmousedown={(ev) => updatePicker(ev, true)}
			onmousemove={(ev) => updatePicker(ev, pickerActive, pickerActive)}
			onmouseup={(ev) => updatePicker(ev, false, pickerActive)}
			onmouseleave={(ev) => updatePicker(ev, false, pickerActive)}
			bind:offsetWidth={pickerWidth}
			bind:offsetHeight={pickerHeight}
		></div>
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="hue" bind:offsetWidth={sliderWidth}>
		<div class="hue-circle"></div>
		<div
			class="hue-handler"
			onmousedown={(ev) => changeHue(ev, true)}
			onmousemove={(ev) => changeHue(ev, sliderActive, sliderActive)}
			onmouseup={(ev) => changeHue(ev, false)}
			onmouseleave={(ev) => changeHue(ev, false, sliderActive)}
		></div>
	</div>
	<div class="controlls">
		<div class="preview" style:--white="{white}%" style:--black="{black}%"></div>
	</div>
</div>

<style>
	.wrapper {
		overflow: visible;
	}
	.picker {
		width: 250px;
		height: 250px;
		display: inline-block;
		background-image: linear-gradient(rgba(0, 0, 0, 0), #000),
			linear-gradient(90deg, #fff, hwb(var(--hue) 0 0));
		position: relative;
		margin: 5px;
	}

	.hue {
		height: 10px;
		background-image: linear-gradient(to right in hwb longer hue, hwb(0 0% 2%), hwb(360 0 0));
		position: relative;
		margin: 5px;
	}

	.hue-circle {
		position: absolute;
		width: 10px;
		height: 10px;
		border: 1px solid black;
		top: 50%;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background-color: white;
		left: calc(var(--hue) / 360 * 100%);
	}

	.picker-circle {
		position: absolute;
		width: 10px;
		height: 10px;
		border: 1px solid black;
		transform: translate(50%, -50%);
		border-radius: 50%;
		background-color: white;
	}

	.hue-handler,
	.picker-handler {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
	}

	.preview {
		height: 20px;
		background-color: hwb(var(--hue) var(--white) var(--black));
	}
</style>
