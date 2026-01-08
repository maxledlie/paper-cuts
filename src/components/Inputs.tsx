import type { Vec2 } from "../uiTypes";

interface FloatDisplayProps {
    name: string;
    value: number;
    setValue: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
}
export function FloatDisplay({
    name,
    value,
    setValue,
    min,
    max,
    step,
}: FloatDisplayProps) {
    return (
        <div className="form-group">
            <label className="form-label">{name}</label>
            <input
                className="form-input"
                type="number"
                name={`${name} x`}
                value={truncateFloat(value, 2)}
                step={step ?? 0.01}
                onChange={(e) => {
                    let val = parseFloat(e.target.value);
                    if (min != null) {
                        val = Math.max(min, val);
                    }
                    if (max != null) {
                        val = Math.min(max, val);
                    }
                    setValue(val);
                }}
            />
        </div>
    );
}

interface VectorDisplayProps {
    name: string;
    vector: Vec2;
    setVector: (v: Vec2) => void;
    min?: number;
    max?: number;
    step?: number;
}
export function VectorDisplay({
    name,
    vector,
    setVector,
    min,
    max,
    step,
}: VectorDisplayProps) {
    const clampValue = (val: number): number => {
        if (min != null) {
            val = Math.max(min, val);
        }
        if (max != null) {
            val = Math.min(max, val);
        }
        return val;
    };

    return (
        <div className="vector-group">
            <div className="vector-group-title">{name}</div>
            <div className="form-group">
                <label className="form-label form-label-short">X</label>
                <input
                    className="form-input"
                    type="number"
                    name={`${name} x`}
                    value={truncateFloat(vector.x, 2)}
                    step={step ?? 1}
                    onChange={(e) =>
                        setVector({
                            x: clampValue(parseFloat(e.target.value)),
                            y: vector.y,
                        })
                    }
                />
            </div>
            <div className="form-group">
                <label className="form-label form-label-short">Y</label>
                <input
                    className="form-input"
                    type="number"
                    name={`${name} y`}
                    value={truncateFloat(vector.y, 2)}
                    step={step ?? 1}
                    onChange={(e) =>
                        setVector({
                            x: vector.x,
                            y: clampValue(parseFloat(e.target.value)),
                        })
                    }
                />
            </div>
        </div>
    );
}

function truncateFloat(n: number, numDecimalPlaces: number): number {
    return (
        Math.round(n * Math.pow(10, numDecimalPlaces)) /
        Math.pow(10, numDecimalPlaces)
    );
}
