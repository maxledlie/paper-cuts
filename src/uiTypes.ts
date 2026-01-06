import type { Color } from "./shared/color";
import type { Material } from "./shared/material";

export interface Vec2 {
    x: number;
    y: number;
}

export interface CameraSetup {
    center: Vec2;
    rotation: number;
    size: Vec2;
}

export interface Transform {
    scale: Vec2;
    rotation: number;
    translation: Vec2;
}

export interface UIShape {
    transform: Transform;
    material: Material;
}

export interface UILight {
    transform: Transform;
    color: Color;
}
