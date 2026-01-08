import { useState } from "react";
import "../styles/SidePanel.css";

interface SidePanelProps {
    topContent: React.ReactNode;
    bottomContent: React.ReactNode;
}

export default function SidePanel({
    topContent,
    bottomContent,
}: SidePanelProps) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className={`side-panel ${isOpen ? "open" : "closed"}`}>
            <button
                className="side-panel-toggle"
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? "Collapse" : "Expand"}
            >
                {isOpen ? "▼" : "▶"}
            </button>
            {isOpen && (
                <div className="side-panel-container">
                    <div className="side-panel-top">{topContent}</div>
                    <div className="side-panel-divider" />
                    <div className="side-panel-bottom">{bottomContent}</div>
                </div>
            )}
        </div>
    );
}
