import Camera, { type CameraSetup } from "../camera.js";
import {
    type Vec3,
    vec_add,
    vec_sub,
    vec_mul,
    newPoint,
    newVector,
    vec_div,
    vec_magnitude,
    mat3_mul_mat,
    mat3_identity,
    mat3_chain,
} from "../math.js";
import { Shape, Quad, Circle } from "../shapes.js";
import {
    color_add,
    color_html,
    color_mul,
    type Color,
} from "../shared/color.js";
import { defaultMaterial, type Material } from "../shared/material.js";
import {
    type Transform,
    apply,
    fromObjectTransform,
    scaling,
    toObjectTransform,
    translation,
} from "../transform.js";
import { PointLight } from "./PointLight.js";
import { Canvas } from "./canvas.js";
import { Eye } from "./Eye.js";
import { setLogging, toggleSchlick } from "./optics.js";
import SelectionLayer from "./selection.js";
import { lightingModelRegistry } from "./lightingModelRegistry.js";
import { PhongTracingModel } from "./models/phongTracingModel.js";
import type { LightingModel, LightingModelParams } from "./lightingModel.js";

type ToolType = "quad" | "circle" | "pan" | "select" | "light";

const FRAME_RATE = 60;

interface Tool {
    type: ToolType;
    hotkey: string;
    name: string;
}

const tools: Tool[] = [
    { type: "circle", name: "Circle", hotkey: "c" },
    { type: "quad", name: "Quad", hotkey: "q" },
    { type: "pan", name: "Pan", hotkey: "p" },
    { type: "select", name: "Select", hotkey: "s" },
    { type: "light", name: "Light", hotkey: "l" },
];

interface Animation {
    from: CameraSetup;
    to: CameraSetup;
    time: number;
    end: number;
}

interface State {
    debug: boolean;
    camera: Camera;
    tool: ToolType;
    shapes: Shape[];
    lastMousePos: Vec3;
    isMouseDown: boolean;
    placementStartWorld: Vec3 | null;
    panStart: Vec3 | null;
    eye: Eye;
    cameraPath: Animation | null;
    lights: PointLight[];
    vision: boolean;
    lastCameraSetup: CameraSetup | null;
    lightingModelId: string;
    lightingModelParams: LightingModelParams;
}

function defaultState(): State {
    // Register the Phong tracing model as default
    const phongModel = new PhongTracingModel();
    lightingModelRegistry.register(phongModel.id, phongModel, true);

    // Get default parameters
    const defaultParams: LightingModelParams = {};
    for (const param of phongModel.parameters) {
        defaultParams[param.id] = param.default;
    }

    return {
        debug: false,
        lastMousePos: newPoint(0, 0),
        isMouseDown: false,
        placementStartWorld: null,
        panStart: null,
        tool: "select",
        eye: new Eye(
            fromObjectTransform({
                translation: newVector(-6, 0),
                rotation: 0,
                scale: newVector(1, 1),
            })
        ),
        shapes: [],
        camera: new Camera(1, 1), // We don't know the screen width and height yet.
        cameraPath: null,
        lights: [],
        vision: true,
        lastCameraSetup: null,
        lightingModelId: phongModel.id,
        lightingModelParams: defaultParams,
    };
}

export class RaymondCanvas extends Canvas {
    state: State = defaultState();
    cameraImage: HTMLImageElement;
    selectionLayer: SelectionLayer = new SelectionLayer(this.state.camera);

    constructor(canvas: HTMLCanvasElement, cameraImage: HTMLImageElement) {
        super(canvas);
        this.cameraImage = cameraImage;
    }

    setup() {
        const { state } = this;

        // We have to set these again once things are initialised.
        state.camera = new Camera(this.width, this.height);
        this.selectionLayer = new SelectionLayer(this.state.camera);

        // Set up default world
        const shapes = [
            new Circle(
                fromObjectTransform({
                    translation: newVector(0, 0),
                    scale: newVector(2, 2),
                    rotation: 0,
                }),
                {
                    ...defaultMaterial(),
                }
            ),
        ];

        for (const s of shapes) {
            state.shapes.push(s);
            this.selectionLayer.addSelectable(s);
        }

        this.selectionLayer.addSelectable(state.eye);

        const lights = [
            new PointLight(
                { r: 1, g: 1, b: 1 },
                fromObjectTransform({
                    translation: newVector(-5, 2),
                    rotation: 0,
                    scale: newVector(1, 1),
                })
            ),
        ];
        for (const x of lights) {
            state.lights.push(x);
            this.selectionLayer.addSelectable(x);
        }
    }

    keyPressed(e: KeyboardEvent): void {
        const { state } = this;
        if (e.key.toUpperCase() === "D") {
            state.debug = !state.debug;
        }
        if (e.key.toUpperCase() === "P") {
            toggleSchlick();
        }
        if (e.key.toUpperCase() === "V") {
            state.vision = !state.vision;
        }
        if (e.key.toUpperCase() === "B" && state.lastCameraSetup) {
            // For demo purposes, bring camera back to previous position
            state.cameraPath = {
                from: { ...state.camera.getSetup() },
                to: state.lastCameraSetup,
                time: 0,
                end: 2,
            };
        }
        if (e.key === "1") {
            setLogging(true);
        }

        const selectedObject = this.selectionLayer.getSelectedObject();
        if (
            e.key === "Delete" &&
            selectedObject &&
            selectedObject !== state.eye
        ) {
            state.shapes = state.shapes.filter((s) => s !== selectedObject);
            state.lights = state.lights.filter((l) => l !== selectedObject);
            this.selectionLayer.removeSelectable(selectedObject!);
        }
        for (const tool of tools) {
            if (e.key.toUpperCase() === tool.hotkey.toUpperCase()) {
                state.tool = tool.type;
            }
        }
    }

    keyUp(e: KeyboardEvent): void {
        if (e.key === "1") {
            setLogging(false);
        }
    }

    mousePressed(e: MouseEvent): void {
        const { state } = this;
        if (e.button === 0) {
            state.isMouseDown = true;
        }

        const mouseScreen = newPoint(this.mouseX, this.mouseY);
        const mouseWorld = state.camera.screenToWorld(mouseScreen);

        if (e.button === 0) {
            if (state.tool === "select") {
                this.selectionLayer.mouseDown(mouseScreen);
            } else {
                state.placementStartWorld = mouseWorld;
            }
        }
        if (e.button === 1 || state.tool === "pan") {
            state.panStart = mouseScreen;
        }
    }

    mouseWheel(e: WheelEvent): void {
        const { state } = this;
        const zoomSpeed = 0.0001;
        const zoomFrac = zoomSpeed * e.deltaY;
        state.camera.zoom(zoomFrac, newPoint(this.mouseX, this.mouseY));
    }

    mouseReleased(e: MouseEvent): void {
        const { state } = this;
        state.isMouseDown = false;
        this.selectionLayer.mouseUp();
        if (e.button === 0) {
            if (state.tool === "light") {
                const previewLight = this.computePreviewLight();
                if (previewLight) {
                    state.lights.push(previewLight);
                    this.selectionLayer.addSelectable(previewLight);
                }
            } else {
                const previewShape = this.computePreviewShape();
                if (previewShape) {
                    state.shapes.push(previewShape);
                    this.selectionLayer.addSelectable(previewShape);
                }
            }
            state.placementStartWorld = null;
        }
        if (e.button == 1 || state.tool == "pan") {
            state.panStart = null;
        }
    }

    mouseMoved(e: MouseEvent): void {
        const dragEndScreen = newPoint(e.offsetX, e.offsetY);
        const dragStartScreen = vec_sub(
            dragEndScreen,
            newVector(e.movementX, e.movementY)
        );
        this.selectionLayer.mouseMoved(dragStartScreen, dragEndScreen);
    }

    doubleClicked() {
        const { state } = this;
        const shape = this.selectionLayer.getSelectedObject();

        if (shape) {
            // Position the camera such that the shape's bounding box appears to be a unit square at the center of the screen
            const aspectRatio = this.width / this.height;
            const worldCenter = apply(shape.transform, newPoint(0, 0));
            const o = toObjectTransform(shape.transform);
            const target: CameraSetup = {
                center: worldCenter,
                rotation: o.rotation,
                size: newVector(o.scale.x * aspectRatio * 10, o.scale.y * 10),
            };
            state.lastCameraSetup = state.camera.getSetup();
            state.cameraPath = {
                from: { ...state.camera.getSetup() },
                to: target,
                time: 0,
                end: 2,
            };
        }
    }

    smoothstep(x: number): number {
        const f = 3 * Math.pow(x, 2) - 2 * Math.pow(x, 3);
        return Math.max(0, Math.min(1, f));
    }

    draw() {
        const { ctx, width, height, state } = this;

        // Update camera path if active
        if (state.cameraPath) {
            const path = state.cameraPath;
            if (path.time >= path.end) {
                state.cameraPath = null;
            } else {
                path.time += 1 / FRAME_RATE;
                const frac = path.time / path.end;
                const smoothX = this.smoothstep(frac);
                state.camera.setSetup(
                    Camera.interpSetup(path.from, path.to, smoothX)
                );
            }
        }

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        // Draw tool menu
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = "14px monospace";

        // Only show tool text if vision bar is not on the left
        const visionPosition =
            (state.lightingModelParams?.visionPosition as string) ?? "bottom";
        if (visionPosition !== "left") {
            for (let i = 0; i < tools.length; i++) {
                const tool = tools[i];
                const text =
                    (state.tool == tool.type ? "> " : "  ") +
                    tool.name +
                    " (" +
                    tool.hotkey.toUpperCase() +
                    ")";
                ctx.fillText(text, 10, 20 * (i + 1));
            }
        }

        const mouseScreen = newPoint(this.mouseX, this.mouseY);
        const mouseWorld = state.camera.screenToWorld(mouseScreen);

        if (state.debug) {
            ctx.fillText(
                `World: x: ${mouseWorld.x.toFixed(
                    2
                )}, y: ${mouseWorld.y.toFixed(2)}`,
                width - 10,
                40
            );
            ctx.fillText(
                `Screen: x: ${mouseScreen.x.toFixed(
                    2
                )}, y: ${mouseScreen.y.toFixed(2)}`,
                width - 10,
                60
            );
        }

        // Handle panning
        if (state.panStart != null) {
            const mouseDelta = vec_sub(mouseScreen, state.lastMousePos);
            state.camera.pan(mouseDelta);
        }

        // Draw coordinate grid
        const minorColor = "rgb(100 100 100 / 30%)";
        const majorColor = "rgb(255 255 255)";
        this.drawCoordinates(mat3_identity(), majorColor, minorColor, 100);

        // Draw preview entities
        let previewShape = this.computePreviewShape();
        let previewLight = this.computePreviewLight();

        const shapes: Shape[] = [...state.shapes];
        if (previewShape) {
            shapes.push(previewShape);
        }
        const lights = [...state.lights];
        if (previewLight) {
            lights.push(previewLight);
        }

        // Draw shapes including preview shape
        for (const shape of shapes) {
            const hovered = shape.hitTest(mouseWorld);
            this.drawShape(shape, hovered);
        }

        for (const light of lights) {
            this.drawLight(light);
        }

        this.drawEye(ctx, state.eye, false);

        // Draw selection box and handles for selected shape
        this.selectionLayer.draw(this.ctx);

        // Work out the segments to actually draw using the active lighting model
        const lightingModel = lightingModelRegistry.get(state.lightingModelId);
        if (!lightingModel) {
            throw new Error(
                `Lighting model "${state.lightingModelId}" not found in registry`
            );
        }
        const { segments, vision, shadowRays } = lightingModel.computeSegments(
            state.eye,
            shapes,
            lights,
            state.lightingModelParams
        );

        ctx.lineWidth = 2;
        for (const {
            start,
            end,
            color,
            attenuation,
            dashed,
            normal,
        } of segments) {
            if (dashed) {
                ctx.strokeStyle = "white";
                ctx.setLineDash([25, 10]);
            } else {
                ctx.strokeStyle = color_html(color, attenuation);
            }
            this.drawLine(start, end);
            ctx.setLineDash([]);

            // Draw normal vector if present
            if (normal) {
                ctx.save();
                ctx.lineWidth = 1;
                ctx.strokeStyle = "cyan";
                ctx.setLineDash([]);
                const normalLength = 0.2; // Short line to visualize direction
                const normalEnd = vec_add(end, vec_mul(normal, normalLength));
                this.drawLine(end, normalEnd);
                ctx.restore();
            }
        }

        // Draw shadow rays if available
        if (shadowRays && shadowRays.length > 0) {
            ctx.lineWidth = 1;
            for (const {
                start,
                end,
                color,
                attenuation,
                dashed,
            } of shadowRays) {
                if (dashed) {
                    ctx.strokeStyle = "white";
                    ctx.setLineDash([5, 5]);
                } else {
                    ctx.strokeStyle = color_html(color, attenuation);
                }
                this.drawLine(start, end);
                ctx.setLineDash([]);
            }
        }

        // Draw what the eye sees!
        if (state.vision) {
            const visionPosition =
                (state.lightingModelParams?.visionPosition as string) ??
                "bottom";

            if (visionPosition === "left") {
                // Draw vision rectangle vertically on the left
                const pad = 40;
                const width = 100;
                const height = this.height - 2 * pad;

                ctx.strokeStyle = "white";
                ctx.strokeRect(pad, pad, width, height);

                if (state.eye) {
                    const yStep = height / state.eye.numRays;
                    for (let i = 0; i < state.eye.numRays; i++) {
                        ctx.fillStyle = color_html(
                            vision[i] ?? { r: 0, g: 0, b: 0 },
                            1
                        );
                        ctx.fillRect(
                            pad,
                            pad + i * yStep,
                            width,
                            yStep + (i === state.eye.numRays - 1 ? 0 : 1)
                        );
                    }

                    // Optionally draw light-grey boundaries between vision cells
                    const showBoundaries =
                        !!state.lightingModelParams?.showVisionBoundaries;
                    if (showBoundaries) {
                        ctx.save();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = this.color(200, 200, 200, 255);
                        const leftX = pad;
                        const rightX = pad + width;
                        for (let i = 1; i < state.eye.numRays; i++) {
                            const y = pad + i * yStep;
                            ctx.beginPath();
                            ctx.moveTo(leftX, y);
                            ctx.lineTo(rightX, y);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }
                }
            } else {
                // Draw vision rectangle horizontally at the bottom (default)
                const pad = 40;
                ctx.strokeStyle = "white";
                ctx.strokeRect(
                    pad,
                    this.height - 120,
                    this.width - 2 * pad,
                    100
                );
                if (state.eye) {
                    const xStep = (this.width - 2 * pad) / state.eye.numRays;
                    for (let i = 0; i < state.eye.numRays; i++) {
                        ctx.fillStyle = color_html(
                            vision[i] ?? { r: 0, g: 0, b: 0 },
                            1
                        );
                        ctx.fillRect(
                            pad + i * xStep,
                            this.height - 120,
                            xStep + (i === state.eye.numRays - 1 ? 0 : 1),
                            100
                        );
                    }

                    // Optionally draw light-grey boundaries between vision cells
                    const showBoundaries =
                        !!state.lightingModelParams?.showVisionBoundaries;
                    if (showBoundaries) {
                        ctx.save();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = this.color(200, 200, 200, 255);
                        const topY = this.height - 120;
                        const bottomY = topY + 100;
                        for (let i = 1; i < state.eye.numRays; i++) {
                            const x = pad + i * xStep;
                            ctx.beginPath();
                            ctx.moveTo(x, topY);
                            ctx.lineTo(x, bottomY);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }
                }
            }
        }

        state.lastMousePos = mouseScreen;
    }

    /** Draws a line described in world space using the current camera transform and canvas drawing state */
    drawLine(start: Vec3, end: Vec3) {
        const { state, ctx } = this;
        const startScreen = state.camera.worldToScreen(start);
        const endScreen = state.camera.worldToScreen(end);
        ctx.beginPath();
        ctx.moveTo(startScreen.x, startScreen.y);
        ctx.lineTo(endScreen.x, endScreen.y);
        ctx.stroke();
    }

    color(r: number, g: number, b: number, a?: number): string {
        if (a == null) {
            return `rgb(${r} ${g} ${b})`;
        } else {
            return `rgb(${r} ${g} ${b} / ${(a * 100) / 255}%)`;
        }
    }

    drawShape(shape: Shape, hovered: boolean) {
        const { state, ctx } = this;
        if (hovered && state.debug) {
            const majorColor = this.color(100, 100, 255, 255);
            const minorColor = this.color(100, 100, 255, 200);
            this.drawCoordinates(shape.transform, majorColor, minorColor, 2);
        }
        const oldTransform = ctx.getTransform();

        // Get the combination of object and camera transforms
        const mat = mat3_mul_mat(state.camera.transform, shape.transform);
        ctx.setTransform(
            mat[0][0],
            mat[1][0],
            mat[0][1],
            mat[1][1],
            mat[0][2],
            mat[1][2]
        );

        const trueColor = color_html(
            shape.material.color,
            1 - shape.material.transparency
        );
        if (shape.material.reflectivity > 0) {
            const gradient = ctx.createLinearGradient(-1, -1, 1, 1);
            const specularColor = color_html(
                color_add(
                    shape.material.color,
                    color_mul({ r: 1, g: 1, b: 1 }, shape.material.reflectivity)
                ),
                1 - shape.material.transparency
            );
            gradient.addColorStop(0, trueColor);
            gradient.addColorStop(0.25, trueColor);
            gradient.addColorStop(0.5, specularColor);
            gradient.addColorStop(0.75, trueColor);
            gradient.addColorStop(1, trueColor);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = trueColor;
        }

        switch (shape.type()) {
            case "quad":
                this.drawQuad();
                break;
            case "circle":
                this.drawCircle();
                break;
        }

        ctx.setTransform(oldTransform);
    }

    drawEye(ctx: CanvasRenderingContext2D, eye: Eye, hovered: boolean) {
        const { state } = this;

        // Draw camera image

        const oldTransform = ctx.getTransform();

        // Get the combination of object and camera transforms
        const mat = mat3_mul_mat(state.camera.transform, eye.transform);

        // Hacks to get the image to the correct orientation
        const m = mat3_chain([mat, scaling(1, -1), translation(-0.8, -0.5)]);
        ctx.setTransform(m[0][0], m[1][0], m[0][1], m[1][1], m[0][2], m[1][2]);

        // Draw the camera image so it occupies the eye's local rectangle
        ctx.drawImage(this.cameraImage, 0, 0, 1, 1);
        ctx.setTransform(oldTransform);

        if (hovered && state.debug) {
            // Draw local coordinate system of eye
            const minorColor = this.color(0, 100, 0, 100);
            const majorColor = this.color(0, 255, 0, 255);
            this.drawCoordinates(eye.transform, majorColor, minorColor, 2);
        }
    }

    drawLight(light: PointLight) {
        const { ctx, state } = this;

        // Get combination of object and camera transforms

        // Get the combination of object and camera transforms
        const mat = mat3_mul_mat(state.camera.transform, light.transform);
        const oldTransform = ctx.getTransform();
        ctx.setTransform(
            mat[0][0],
            mat[1][0],
            mat[0][1],
            mat[1][1],
            mat[0][2],
            mat[1][2]
        );

        const CIRCLE_RADIUS = 0.1;
        ctx.fillStyle = color_html(light.color, 1);
        ctx.beginPath();
        ctx.arc(0, 0, CIRCLE_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        ctx.setTransform(oldTransform);
    }

    drawQuad() {
        this.ctx.fillRect(-1, -1, 2, 2);
    }

    drawCircle() {
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 1, 1, 0, 0, 2 * Math.PI);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Given a `transform` that maps points from one space to another, draws the coordinates
     * of this new space.
     */
    drawCoordinates(
        transform: Transform,
        majorColor: string,
        minorColor: string,
        gridSize: number
    ) {
        const { ctx } = this;
        ctx.lineWidth = 1;
        ctx.strokeStyle = minorColor;
        for (let i = -gridSize; i <= gridSize; i++) {
            const xStartWorld = apply(transform, newPoint(i, -gridSize));
            const xEndWorld = apply(transform, newPoint(i, gridSize));
            this.drawLine(xStartWorld, xEndWorld);

            const yStartWorld = apply(transform, newPoint(-gridSize, i));
            const yEndWorld = apply(transform, newPoint(gridSize, i));
            this.drawLine(yStartWorld, yEndWorld);
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = majorColor;
        const xAxisEndLocal = newPoint(gridSize, 0);
        const yAxisEndLocal = newPoint(0, gridSize);
        const yAxisStartWorld = apply(transform, newPoint(0, -gridSize));
        const yAxisEndWorld = apply(transform, yAxisEndLocal);
        const xAxisStartWorld = apply(transform, newPoint(-gridSize, 0));
        const xAxisEndWorld = apply(transform, xAxisEndLocal);
        this.drawLine(yAxisStartWorld, yAxisEndWorld);
        this.drawLine(xAxisStartWorld, xAxisEndWorld);

        // Arrow heads indicating direction of axes
        const yAxisLeftLocal = vec_add(yAxisEndLocal, newVector(-0.1, -0.1));
        const yAxisRightLocal = vec_add(yAxisEndLocal, newVector(0.1, -0.1));
        const yAxisLeftWorld = apply(transform, yAxisLeftLocal);
        const yAxisRightWorld = apply(transform, yAxisRightLocal);
        this.drawLine(yAxisEndWorld, yAxisLeftWorld);
        this.drawLine(yAxisEndWorld, yAxisRightWorld);

        const xAxisLeftLocal = vec_add(xAxisEndLocal, newVector(-0.1, 0.1));
        const xAxisRightLocal = vec_add(xAxisEndLocal, newVector(-0.1, -0.1));
        const xAxisLeftWorld = apply(transform, xAxisLeftLocal);
        const xAxisRightWorld = apply(transform, xAxisRightLocal);
        this.drawLine(xAxisEndWorld, xAxisLeftWorld);
        this.drawLine(xAxisEndWorld, xAxisRightWorld);
    }

    /** Returns true if clicking at the given world point should highlight the entity */
    hitTestShape(shape: Shape, mouseVec: Vec3): boolean {
        const { state } = this;
        const worldPoint = state.camera.screenToWorld(mouseVec);
        return shape.hitTest(worldPoint);
    }

    computePreviewShape(): Shape | null {
        const { state } = this;
        if (!state.placementStartWorld) {
            return null;
        }

        // Don't allow placing teeny tiny objects
        const placementStartScreen = state.camera.worldToScreen(
            state.placementStartWorld
        );
        if (
            vec_magnitude(
                vec_sub(
                    placementStartScreen,
                    newPoint(this.mouseX, this.mouseY)
                )
            ) < 5
        ) {
            return null;
        }

        switch (state.tool) {
            case "quad":
                return this.computePreviewQuad(state.placementStartWorld);
            case "circle":
                return this.computePreviewCircle(state.placementStartWorld);
        }
        return null;
    }

    /**
     * Returns the quad that would be placed if the mouse were released after dragging a certain line on the screen.
     * The quad is that which would fill the axis-aligned bounding box of which the drawn line is the diagonal.
     **/
    computePreviewQuad(placementStart: Vec3): Shape | null {
        const { state } = this;
        const endWorld = state.camera.screenToWorld(
            newPoint(this.mouseX, this.mouseY)
        );
        const startWorld = placementStart;

        const width = Math.abs(endWorld.x - startWorld.x);
        const height = Math.abs(endWorld.y - startWorld.y);

        const centre = vec_div(vec_add(startWorld, endWorld), 2);
        const transform = fromObjectTransform({
            scale: newVector(width, height),
            rotation: 0,
            translation: newVector(centre.x, centre.y),
        });
        return new Quad(transform);
    }

    /**
     * Returns the circle (ellipse) that would be placed if the mouse were released after dragging a certain line on the screen.
     * The sphere is that which would fill the axis-aligned bounding box of which the drawn line is the diagonal.
     */
    computePreviewCircle(placementStart: Vec3): Circle | null {
        const { state } = this;
        const endWorld = state.camera.screenToWorld(
            newPoint(this.mouseX, this.mouseY)
        );
        const startWorld = placementStart;

        const width = Math.abs(endWorld.x - startWorld.x);
        const height = Math.abs(endWorld.y - startWorld.y);

        if (Math.min(width, height) === 0) {
            return null;
        }

        const centre = vec_div(vec_add(startWorld, endWorld), 2);
        const transform = fromObjectTransform({
            scale: newVector(width, height),
            rotation: 0,
            translation: newVector(centre.x, centre.y),
        });
        return new Circle(transform);
    }

    computePreviewEye(): Eye | null {
        const { state } = this;
        if (state.placementStartWorld == null) {
            return null;
        }
        const end = state.camera.screenToWorld(
            newPoint(this.mouseX, this.mouseY)
        );
        const dir = vec_sub(end, state.placementStartWorld);
        const theta = Math.atan2(dir.y, dir.x);
        const transform = fromObjectTransform({
            scale: newVector(1, 1),
            rotation: theta,
            translation: newVector(
                state.placementStartWorld.x,
                state.placementStartWorld.y
            ),
        });
        return new Eye(transform);
    }

    computePreviewLight(): PointLight | null {
        const { state } = this;
        if (state.placementStartWorld == null || state.tool !== "light") {
            return null;
        }
        const transform = fromObjectTransform({
            scale: newVector(1, 1),
            rotation: 0,
            translation: state.camera.screenToWorld(
                newPoint(this.mouseX, this.mouseY)
            ),
        });
        return new PointLight({ r: 1, g: 1, b: 1 }, transform);
    }

    // Functions for updates via UI

    setCameraTransform(transform: Transform) {
        this.state.camera.transform = transform;
    }

    setSelectedTransform(transform: Transform) {
        const shape = this.selectionLayer.getSelectedObject();
        if (shape) {
            shape.transform = transform;
        }
    }

    setSelectedMaterial(material: Material) {
        const selected = this.selectionLayer.getSelectedObject();
        if (selected instanceof Shape) {
            selected.material = material;
        }
    }

    setSelectedColor(color: Color) {
        const selected = this.selectionLayer.getSelectedObject();
        if (selected instanceof PointLight) {
            selected.color = color;
        }
    }

    setLightingModelId(modelId: string) {
        const model = lightingModelRegistry.get(modelId);
        if (!model) {
            console.error(`Lighting model "${modelId}" not found`);
            return;
        }
        this.state.lightingModelId = modelId;

        // Reset parameters to defaults
        const params: LightingModelParams = {};
        for (const param of model.parameters) {
            params[param.id] = param.default;
        }
        this.state.lightingModelParams = params;
    }

    setLightingModelParam(paramId: string, value: unknown) {
        this.state.lightingModelParams[paramId] = value;
    }

    getLightingModelId(): string {
        return this.state.lightingModelId;
    }

    getLightingModel(): LightingModel {
        return lightingModelRegistry.get(this.state.lightingModelId)!;
    }

    getLightingModelParams(): LightingModelParams {
        return this.state.lightingModelParams;
    }
}
