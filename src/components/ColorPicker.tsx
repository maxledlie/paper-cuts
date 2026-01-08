import { useState } from "react";
import { type Color } from "../shared/color";
import { clamped } from "../shared/util";
import "../styles/ColorPicker.css";

export interface ColorPickerProps {
    color: Color;
    setColor: (c: Color) => void;
}

export default function ColorPicker({ color, setColor }: ColorPickerProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const hexColor = colorToHex(color);

    const handleHexChange = (hex: string) => {
        const rgb = hexToRGB(hex);
        if (rgb) {
            setColor(rgb);
        }
    };

    return (
        <div className="color-picker-group">
            <div className="vector-group-title">Color</div>

            {/* Color Preview */}
            <div className="color-preview-container">
                <div
                    className="color-preview"
                    style={{
                        backgroundColor: `rgb(${Math.round(
                            color.r * 255
                        )}, ${Math.round(color.g * 255)}, ${Math.round(
                            color.b * 255
                        )})`,
                    }}
                />
                <button
                    className="advanced-toggle"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    title={showAdvanced ? "Hide advanced" : "Show advanced"}
                >
                    {showAdvanced ? "⌄" : "⌃"}
                </button>
            </div>

            {/* Hex Input */}
            <div className="form-group">
                <label className="form-label form-label-short">Hex</label>
                <input
                    className="form-input color-input"
                    type="text"
                    value={hexColor}
                    maxLength={7}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder="#000000"
                />
            </div>

            {/* Advanced RGB Controls */}
            {showAdvanced && (
                <div className="advanced-controls">
                    <div className="form-group">
                        <label className="form-label form-label-short">R</label>
                        <div className="slider-container">
                            <input
                                className="color-slider"
                                type="range"
                                min={0}
                                max={255}
                                value={Math.round(color.r * 255)}
                                onChange={(e) =>
                                    setColor({
                                        ...color,
                                        r: parseInt(e.target.value) / 255,
                                    })
                                }
                                style={{
                                    background: `linear-gradient(to right, rgb(0, ${Math.round(
                                        color.g * 255
                                    )}, ${Math.round(
                                        color.b * 255
                                    )}), rgb(255, ${Math.round(
                                        color.g * 255
                                    )}, ${Math.round(color.b * 255)}))`,
                                }}
                            />
                            <input
                                className="form-input color-number-input"
                                type="number"
                                min={0}
                                max={255}
                                value={Math.round(color.r * 255)}
                                onChange={(e) =>
                                    setColor({
                                        ...color,
                                        r:
                                            clamped(
                                                parseInt(e.target.value),
                                                0,
                                                255
                                            ) / 255,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label form-label-short">G</label>
                        <div className="slider-container">
                            <input
                                className="color-slider"
                                type="range"
                                min={0}
                                max={255}
                                value={Math.round(color.g * 255)}
                                onChange={(e) =>
                                    setColor({
                                        ...color,
                                        g: parseInt(e.target.value) / 255,
                                    })
                                }
                                style={{
                                    background: `linear-gradient(to right, rgb(${Math.round(
                                        color.r * 255
                                    )}, 0, ${Math.round(
                                        color.b * 255
                                    )}), rgb(${Math.round(
                                        color.r * 255
                                    )}, 255, ${Math.round(color.b * 255)}))`,
                                }}
                            />
                            <input
                                className="form-input color-number-input"
                                type="number"
                                min={0}
                                max={255}
                                value={Math.round(color.g * 255)}
                                onChange={(e) =>
                                    setColor({
                                        ...color,
                                        g:
                                            clamped(
                                                parseInt(e.target.value),
                                                0,
                                                255
                                            ) / 255,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label form-label-short">B</label>
                        <div className="slider-container">
                            <input
                                className="color-slider"
                                type="range"
                                min={0}
                                max={255}
                                value={Math.round(color.b * 255)}
                                onChange={(e) =>
                                    setColor({
                                        ...color,
                                        b: parseInt(e.target.value) / 255,
                                    })
                                }
                                style={{
                                    background: `linear-gradient(to right, rgb(${Math.round(
                                        color.r * 255
                                    )}, ${Math.round(
                                        color.g * 255
                                    )}, 0), rgb(${Math.round(
                                        color.r * 255
                                    )}, ${Math.round(color.g * 255)}, 255))`,
                                }}
                            />
                            <input
                                className="form-input color-number-input"
                                type="number"
                                min={0}
                                max={255}
                                value={Math.round(color.b * 255)}
                                onChange={(e) =>
                                    setColor({
                                        ...color,
                                        b:
                                            clamped(
                                                parseInt(e.target.value),
                                                0,
                                                255
                                            ) / 255,
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper functions
function colorToHex(color: Color): string {
    const r = Math.round(color.r * 255)
        .toString(16)
        .padStart(2, "0");
    const g = Math.round(color.g * 255)
        .toString(16)
        .padStart(2, "0");
    const b = Math.round(color.b * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${r}${g}${b}`.toUpperCase();
}

function hexToRGB(hex: string): Color | null {
    // Remove # if present
    hex = hex.replace(/^#/, "");

    // Validate hex format
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
        return null;
    }

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    return { r, g, b };
}
