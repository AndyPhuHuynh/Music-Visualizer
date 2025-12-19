import * as THREE from "three";
import {lerp} from "./interpolation.ts";

export type HSV = {
    h: number; // [0, 360)
    s: number; // [0, 1]
    v: number; // [0, 1]
};

export const hsvToThreeColor = (color: HSV): THREE.Color => {
    const c = color.v * color.s;
    const x = c * (1 - Math.abs(((color.h / 60) % 2) - 1));
    const m = color.v - c;

    let r, g, b;

    if (color.h < 60)       [r, g, b] = [c, x, 0];
    else if (color.h < 120) [r, g, b] = [x, c, 0];
    else if (color.h < 180) [r, g, b] = [0, c, x];
    else if (color.h < 240) [r, g, b] = [0, x, c];
    else if (color.h < 300) [r, g, b] = [x, 0, c];
    else              [r, g, b] = [c, 0, x];

    return new THREE.Color(
        r + m,
        g + m,
        b + m
    );
}

export const numberToHSV = (hex: number): HSV => {
    return threeColorToHSV(new THREE.Color(hex));
}

export const threeColorToHSV = (color: THREE.Color): HSV => {
    const r = color.r;
    const g = color.g;
    const b = color.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    // Value
    const v = max;

    // Saturation
    const s = max === 0 ? 0 : delta / max;

    // Hue
    let h = 0;

    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }

        h *= 60;
        if (h < 0) h += 360;
    }

    return { h, s, v };
}

const lerpHue = (a: number, b: number, t: number): number => {
    let delta = b - a;

    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    return (a + delta * t + 360) % 360;
}

export const gradientHSV = (
    left: HSV,
    right: HSV,
    t: number,
    value: number
): HSV => {
    return {
        h: lerpHue(left.h, right.h, t),
        s: lerp(left.s, right.s, t),
        v: value
    };
}
