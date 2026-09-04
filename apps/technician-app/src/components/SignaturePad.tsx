"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

export function SignaturePad({ value, onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const inkRef = useRef(Boolean(value));
  const [hasInk, setHasInk] = useState(Boolean(value));

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const previous = value;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#111827";

    if (previous) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = previous;
    }
  }, [value]);

  useEffect(() => {
    prepareCanvas();
    const handleResize = () => prepareCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [prepareCanvas]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !drawingRef.current) return;
    const canvas = canvasRef.current;
    const next = pointFromEvent(event);
    const previous = lastPointRef.current;
    if (!canvas || !next || !previous) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPointRef.current = next;
    inkRef.current = true;
    setHasInk(true);
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }
    if (inkRef.current || hasInk || value) {
      onChange(event.currentTarget.toDataURL("image/png"));
    }
  }

  function clear() {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    inkRef.current = false;
    setHasInk(false);
    onChange("");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">Customer signature</p>
          <p className="text-[11px] text-slate-500">Sign inside the box using a finger or stylus.</p>
        </div>
        <button type="button" onClick={clear} disabled={disabled} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50">
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="block h-44 w-full touch-none cursor-crosshair"
        onPointerDown={begin}
        onPointerMove={draw}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Customer signature pad"
      />
    </div>
  );
}
