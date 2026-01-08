import type { Eye } from "./Eye";
import type { Shape } from "../shapes";
import type { PointLight } from "./PointLight";
import type { OpticsResult } from "./optics";

export interface LightingModelParameter {
    id: string;
    name: string;
    type: "boolean" | "number" | "select";
    min?: number;
    max?: number;
    step?: number;
    default: unknown;
    options?: { label: string; value: unknown }[];
}

export type LightingModelParams = Record<string, unknown>;

export interface LightingModel {
    id: string;
    name: string;
    description: string;
    parameters: LightingModelParameter[];
    computeSegments(
        eye: Eye,
        shapes: Shape[],
        lights: PointLight[],
        params: LightingModelParams
    ): OpticsResult;
}
