import { useState } from "react";
import "../styles/CollapsibleSection.css";

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export default function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="collapsible-section">
            <button
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="collapsible-arrow">{isOpen ? "▼" : "▶"}</span>
                <span className="collapsible-title">{title}</span>
            </button>
            {isOpen && <div className="collapsible-content">{children}</div>}
        </div>
    );
}
