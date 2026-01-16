import type {
    LightingModel,
    LightingModelParameter,
    LightingModelParams,
} from "../lightingModel";
import type { OpticsResult } from "../optics";
import { computeSegments as computeOpticsSegments } from "../optics";
import type { Eye } from "../Eye";
import type { Shape } from "../../shapes";
import type { PointLight } from "../PointLight";

export class PhongTracingModel implements LightingModel {
    id = "phong-tracing";
    name = "Phong Ray Tracing";
    description =
        "Classic ray tracing with Phong shading, reflections, and refractions";

    parameters: LightingModelParameter[] = [
        {
            id: "maxDepth",
            name: "Max Recursion Depth",
            type: "number",
            min: 1,
            max: 20,
            step: 1,
            default: 10,
        },
        {
            id: "schlickEnabled",
            name: "Fresnel Reflections (Schlick)",
            type: "boolean",
            default: true,
        },
        {
            id: "showInfiniteRays",
            name: "Show Rays to Infinity (Slow!)",
            type: "boolean",
            default: false,
        },
        {
            id: "showVisionBoundaries",
            name: "Show Vision Cell Boundaries",
            type: "boolean",
            default: false,
        },
        {
            id: "showNormals",
            name: "Show Normal Vectors",
            type: "boolean",
            default: false,
        },
        {
            id: "showShadowRays",
            name: "Show Shadow Rays",
            type: "boolean",
            default: false,
        },
        {
            id: "showReflections",
            name: "Show Reflection Angle",
            type: "boolean",
            default: false,
        },
        {
            id: "visionPosition",
            name: "Vision Rectangle Position",
            type: "select",
            default: "bottom",
            options: [
                { label: "Bottom", value: "bottom" },
                { label: "Left", value: "left" },
            ],
        },
    ];

    computeSegments(
        eye: Eye,
        shapes: Shape[],
        lights: PointLight[],
        params: LightingModelParams
    ): OpticsResult {
        const maxDepth = (params.maxDepth as number) ?? 10;
        const schlickEnabled = (params.schlickEnabled as boolean) ?? true;
        const showInfiniteRays = (params.showInfiniteRays as boolean) ?? false;
        const showNormals = (params.showNormals as boolean) ?? false;
        const showShadowRays = (params.showShadowRays as boolean) ?? false;
        const showReflections = (params.showReflections as boolean) ?? false;

        return computeOpticsSegments(
            eye,
            shapes,
            lights,
            maxDepth,
            schlickEnabled,
            showInfiniteRays,
            showNormals,
            showShadowRays,
            showReflections
        );
    }
}
