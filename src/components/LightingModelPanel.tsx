import { useEffect, useState } from "react";
import type { RaymondCanvas } from "../canvas/raymondCanvas";
import type {
    LightingModel,
    LightingModelParams,
} from "../canvas/lightingModel";
import { FloatDisplay } from "./Inputs";
import CollapsibleSection from "./CollapsibleSection";

interface LightingModelPanelProps {
    canvas: RaymondCanvas | null;
}

export default function LightingModelPanel({
    canvas,
}: LightingModelPanelProps) {
    const [lightingModel, setLightingModel] = useState<LightingModel | null>(
        null
    );
    const [params, setParams] = useState<LightingModelParams>({});

    // Sync with canvas state
    useEffect(() => {
        if (!canvas) return;

        const updateState = () => {
            const model = canvas.getLightingModel();
            const currentParams = canvas.getLightingModelParams();

            setLightingModel(model);
            setParams({ ...currentParams });
        };

        updateState();

        // Poll canvas state periodically
        const interval = setInterval(updateState, 1000 / 32);
        return () => clearInterval(interval);
    }, [canvas]);

    const handleParameterChange = (paramId: string, value: unknown) => {
        if (!canvas) return;
        canvas.setLightingModelParam(paramId, value);
        setParams((prev) => ({ ...prev, [paramId]: value }));
    };

    if (!canvas || !lightingModel) {
        return (
            <div className="lighting-model-panel">
                <h2>Lighting Model</h2>
                <p>No lighting model available.</p>
            </div>
        );
    }

    return (
        <div className="lighting-model-panel">
            <h2>Lighting Model</h2>

            {/* Model Parameters */}
            {lightingModel.parameters.length > 0 && (
                <CollapsibleSection title="Parameters" defaultOpen={true}>
                    {lightingModel.parameters.map((param) => {
                        const currentValue = params[param.id] ?? param.default;

                        if (param.type === "boolean") {
                            return (
                                <div key={param.id} className="form-group">
                                    <label className="form-label">
                                        {param.name}
                                    </label>
                                    <input
                                        type="checkbox"
                                        checked={currentValue as boolean}
                                        onChange={(e) =>
                                            handleParameterChange(
                                                param.id,
                                                e.target.checked
                                            )
                                        }
                                        style={{
                                            width: "20px",
                                            height: "20px",
                                            cursor: "pointer",
                                        }}
                                    />
                                </div>
                            );
                        }

                        if (param.type === "number") {
                            return (
                                <FloatDisplay
                                    key={param.id}
                                    name={param.name}
                                    value={currentValue as number}
                                    setValue={(value) =>
                                        handleParameterChange(param.id, value)
                                    }
                                    min={param.min}
                                    max={param.max}
                                    step={param.step}
                                />
                            );
                        }

                        if (param.type === "select" && param.options) {
                            return (
                                <div key={param.id} className="form-group">
                                    <label className="form-label">
                                        {param.name}
                                    </label>
                                    <select
                                        className="form-input"
                                        value={String(currentValue)}
                                        onChange={(e) =>
                                            handleParameterChange(
                                                param.id,
                                                e.target.value
                                            )
                                        }
                                    >
                                        {param.options.map((option) => (
                                            <option
                                                key={String(option.value)}
                                                value={String(option.value)}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        }

                        return null;
                    })}
                </CollapsibleSection>
            )}
        </div>
    );
}
