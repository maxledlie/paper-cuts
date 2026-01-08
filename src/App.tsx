import { useEffect, useRef, useState } from "react";
import type {
    CameraSetup,
    UILight,
    UIShape,
    Transform as UITransform,
} from "./uiTypes";
import {
    fromObjectTransform,
    toObjectTransform,
    type Transform,
} from "./transform";
import "./App.css";
import { RaymondCanvas } from "./canvas/raymondCanvas";
import { newVector } from "./math";
import { Shape } from "./shapes";
import ObjectPanel from "./components/ObjectPanel";
import { PointLight } from "./canvas/PointLight";
import LightPanel from "./components/LightPanel";
import SidePanel from "./components/SidePanel";
import LightingModelPanel from "./components/LightingModelPanel";

function App() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [canvas, setCanvas] = useState<RaymondCanvas | null>(null);
    const [selectedObject, setSelectedObject] = useState<UIShape | null>(null);
    const [selectedLight, setSelectedLight] = useState<UILight | null>(null);

    // Initialise the canvas once the canvas DOM element and any required images are ready.
    // The canvas will independently draw its current state every frame, and update its current
    // state in response to DOM events on the canvas, like mouse clicks or movement.
    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) {
            throw Error("No canvas element found");
        }

        const img = new Image();
        img.src = "camera_filled.png";

        const onLoad = () => {
            const c = new RaymondCanvas(canvasElement, img);
            c.start();
            setCanvas(c);
        };

        img.addEventListener("load", onLoad);

        return () => {
            img.removeEventListener("load", onLoad);
        };
    }, []);

    // Once canvas is created, start a loop to periodically pull its state into React state
    useEffect(() => {
        if (!canvas) {
            return;
        }

        let cancelled = false;

        const loop = () => {
            if (cancelled || !canvas) {
                return;
            }
            const state = getCanvasState(canvas);
            setSelectedObject(
                state.selectedShape ? serializeShape(state.selectedShape) : null
            );
            setSelectedLight(
                state.selectedLight ? serializeLight(state.selectedLight) : null
            );
            window.setTimeout(loop, 1000 / 32);
        };
        loop();

        // Cleanup on unmount
        return () => {
            cancelled = true;
        };
    }, [canvas]);

    return (
        <div>
            {/* Main canvas */}
            <div
                style={{
                    position: "relative",
                    width: "100vw",
                    height: "100vh",
                }}
            >
                <canvas ref={canvasRef} tabIndex={1} />
            </div>

            {/* UI overlay */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    pointerEvents: "none",
                }}
            >
                <SidePanel
                    topContent={
                        selectedObject ? (
                            <div>
                                <h2>Object Properties</h2>
                                <ObjectPanel
                                    transform={selectedObject.transform}
                                    setTransform={(t) => {
                                        canvas?.setSelectedTransform(
                                            deserializeTransform(t)
                                        );
                                    }}
                                    material={selectedObject.material}
                                    setMaterial={(m) =>
                                        canvas?.setSelectedMaterial(m)
                                    }
                                />
                            </div>
                        ) : selectedLight ? (
                            <div>
                                <h2>Light Properties</h2>
                                <LightPanel
                                    transform={selectedLight.transform}
                                    setTransform={(t) =>
                                        canvas?.setSelectedTransform(
                                            deserializeTransform(t)
                                        )
                                    }
                                    color={selectedLight.color}
                                    setColor={(c) =>
                                        canvas?.setSelectedColor(c)
                                    }
                                />
                            </div>
                        ) : (
                            <div>
                                <h2>Properties</h2>
                                <p>Select an object or light to edit.</p>
                            </div>
                        )
                    }
                    bottomContent={<LightingModelPanel canvas={canvas} />}
                />
            </div>
        </div>
    );
}

interface CanvasState {
    cameraSetup: CameraSetup;
    cameraTransform: UITransform;
    selectedShape: Shape | null;
    selectedLight: PointLight | null;
}

function getCanvasState(canvas: RaymondCanvas): CanvasState {
    const {
        state: { camera },
    } = canvas;

    const selected = canvas.selectionLayer.getSelectedObject();

    return {
        cameraSetup: camera.getSetup(),
        cameraTransform: serializeTransform(camera.transform),
        selectedShape: selected instanceof Shape ? selected : null,
        selectedLight: selected instanceof PointLight ? selected : null,
    };
}

function serializeShape(s: Shape): UIShape {
    const transform = serializeTransform(s.transform);
    const material = { ...s.material };
    return { transform, material };
}

function serializeLight(l: PointLight): UILight {
    const transform = serializeTransform(l.transform);
    return { transform, color: l.color };
}

function serializeTransform(t: Transform): UITransform {
    const o = toObjectTransform(t);
    return {
        translation: {
            x: o.translation.x,
            y: o.translation.y,
        },
        rotation: o.rotation,
        scale: {
            x: o.scale.x,
            y: o.scale.y,
        },
    };
}

function deserializeTransform(t: UITransform): Transform {
    return fromObjectTransform({
        translation: newVector(t.translation.x, t.translation.y),
        rotation: t.rotation,
        scale: newVector(t.scale.x, t.scale.y),
    });
}

export default App;
