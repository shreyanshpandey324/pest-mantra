"use client";

import { useEffect, useMemo, useState } from "react";

const VERSION = 4;
const SIZE = 17 + VERSION * 4; // 33
const DATA_CODEWORDS = 80; // Version 4-L
const ECC_CODEWORDS = 20;

type Matrix = boolean[][];

function appendBits(target: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) target.push(((value >>> i) & 1) !== 0 ? 1 : 0);
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i += 1) result[i] ^= gfMultiply(divisor[i], factor);
  }
  return result;
}

function encodeBytes(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 78) throw new Error("Verification URL is too long for the embedded QR code");

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4); // Byte mode
  appendBits(bits, bytes.length, 8); // Versions 1-9
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }
  let pad = 0;
  while (data.length < DATA_CODEWORDS) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
    pad += 1;
  }

  const payload = Uint8Array.from(data);
  const ecc = rsRemainder(payload, rsDivisor(ECC_CODEWORDS));
  return Uint8Array.from([...payload, ...ecc]);
}

function formatBits(mask: number): number {
  const data = (1 << 3) | mask; // Error correction level L = 01
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

export function makeQrMatrix(value: string): Matrix {
  const modules: Array<Array<boolean | null>> = Array.from({ length: SIZE }, () => Array<boolean | null>(SIZE).fill(null));
  const isFunction: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));

  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(cx + dx, cy + dy, distance === 3 || distance <= 1);
      }
    }
  };

  const drawAlignment = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  drawFinder(3, 3);
  drawFinder(SIZE - 4, 3);
  drawFinder(3, SIZE - 4);
  drawAlignment(26, 26);

  for (let i = 8; i < SIZE - 8; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  // Reserve and then write format information for mask 0.
  const bits = formatBits(0);
  const getBit = (index: number) => ((bits >>> index) & 1) !== 0;
  for (let i = 0; i <= 5; i += 1) setFunction(8, i, getBit(i));
  setFunction(8, 7, getBit(6));
  setFunction(8, 8, getBit(7));
  setFunction(7, 8, getBit(8));
  for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, getBit(i));
  for (let i = 0; i < 8; i += 1) setFunction(SIZE - 1 - i, 8, getBit(i));
  for (let i = 8; i < 15; i += 1) setFunction(8, SIZE - 15 + i, getBit(i));
  setFunction(8, SIZE - 8, true);

  const codewords = encodeBytes(value);
  let bitIndex = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < SIZE; vert += 1) {
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? SIZE - 1 - vert : vert;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (isFunction[y][x]) continue;
        const bit = bitIndex < codewords.length * 8
          ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0
          : false;
        modules[y][x] = bit;
        bitIndex += 1;
      }
    }
  }

  // Mask pattern 0: (row + column) mod 2 == 0.
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (!isFunction[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
    }
  }

  return modules.map((row) => row.map(Boolean));
}

interface QrCodeProps {
  verificationCode: string;
  className?: string;
}

export function QrCode({ verificationCode, className = "" }: QrCodeProps) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const target = useMemo(
    () => (origin ? `${origin}/verify/service/${verificationCode}` : ""),
    [origin, verificationCode]
  );

  let matrix: Matrix | null = null;
  try {
    if (target) matrix = makeQrMatrix(target);
  } catch {
    matrix = null;
  }

  if (!matrix) {
    return (
      <div className={`grid aspect-square place-items-center rounded-xl border border-dashed border-border-strong bg-surface-2 p-3 text-center text-[10px] font-semibold text-ink-muted ${className}`}>
        {verificationCode}
      </div>
    );
  }

  const quiet = 4;
  const dimension = SIZE + quiet * 2;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${dimension} ${dimension}`}
      role="img"
      aria-label={`QR verification code ${verificationCode}`}
      shapeRendering="crispEdges"
    >
      <rect width={dimension} height={dimension} fill="white" />
      <path
        fill="black"
        d={matrix
          .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x + quiet},${y + quiet}h1v1h-1z` : "")))
          .join("")}
      />
    </svg>
  );
}
