<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let isDrawing = $state(false);
	let isEmpty = $state(true);

	let { onSave, onClear } = $props<{
		onSave: (signatureData: string) => void;
		onClear: () => void;
	}>();

	onMount(() => {
		ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.strokeStyle = '#000';
			ctx.lineWidth = 2;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
		}
		resizeCanvas();
	});

	function resizeCanvas() {
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;
	}

	function startDrawing(e: MouseEvent | TouchEvent) {
		if (!ctx) return;
		isDrawing = true;
		isEmpty = false;

		const pos = getPosition(e);
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);
	}

	function draw(e: MouseEvent | TouchEvent) {
		if (!isDrawing || !ctx) return;
		e.preventDefault();

		const pos = getPosition(e);
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();
	}

	function stopDrawing() {
		isDrawing = false;
	}

	function getPosition(e: MouseEvent | TouchEvent) {
		const rect = canvas.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

		return {
			x: clientX - rect.left,
			y: clientY - rect.top
		};
	}

	function clear() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		isEmpty = true;
		onClear();
	}

	function save() {
		if (isEmpty) return;
		const signatureData = canvas.toDataURL('image/png');
		onSave(signatureData);
	}

	export function isSignatureEmpty() {
		return isEmpty;
	}
</script>

<div class="space-y-4">
	<div class="relative">
		<canvas
			bind:this={canvas}
			class="w-full h-48 border-2 border-gray-300 rounded-lg bg-white touch-none cursor-crosshair"
			onmousedown={startDrawing}
			onmousemove={draw}
			onmouseup={stopDrawing}
			onmouseleave={stopDrawing}
			ontouchstart={startDrawing}
			ontouchmove={draw}
			ontouchend={stopDrawing}
		></canvas>
		<div class="absolute bottom-2 left-2 text-xs text-gray-400 pointer-events-none">
			Sign here
		</div>
	</div>

	<div class="flex gap-3">
		<button
			type="button"
			onclick={clear}
			class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
		>
			Clear
		</button>
		<button
			type="button"
			onclick={save}
			disabled={isEmpty}
			class="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			Save Signature
		</button>
	</div>
</div>