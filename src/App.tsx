import "./App.css";
import { useMemo, useState } from "react";
import { Stitch } from "./lib/types";
import PatternSketcher from "./components/PatternSketcher";
import { jsonToStitches } from "./lib/patternParser";

export default function App() {
    const [importedPattern, setImportedPattern] = useState<Stitch[] | null>(
        null
    );

    const patternSketcher = useMemo(
        () => <PatternSketcher importedPattern={importedPattern} />,
        [importedPattern]
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
            const stitches = jsonToStitches(text);
            setImportedPattern(stitches);
        } catch (e: any) {
            alert(
                "Could not parse pattern" + (e.message ? `:\n${e.message}` : "")
            );
        } finally {
            e.target.value = "";
        }
    };

    return (
        <div>
            <h1>Crochet Pattern Designer</h1>
            {patternSketcher}

            <h2>Import Pattern</h2>
            <input
                id="import-pattern"
                type="file"
                onChange={handleFileChange}
            />

            <h2>Hotkeys</h2>
            <i>Right now there is no UI, so we rely on the hotkeys</i>
            <div>
                <h3>Modes</h3>
                <i>
                    Swap between editing modes. Press any mode twice to enter
                    viewing mode.
                </i>
                <ul>
                    <li>
                        <kbd>a</kbd>: Add
                    </li>
                    <li>
                        <kbd>m</kbd>: Move
                    </li>
                    <li>
                        <kbd>d</kbd>: Delete
                    </li>
                    <li>
                        <kbd>i</kbd>: Insert after stitch
                    </li>
                    <li>
                        <kbd>b</kbd>: Rebase
                    </li>
                </ul>
                <h3>Stitch types</h3>
                <i>Change type of stitch when in adding mode</i>
                <ul>
                    <li>
                        <kbd>1</kbd>: Chain (ch)
                    </li>
                    <li>
                        <kbd>2</kbd>: Slip (sl)
                    </li>
                    <li>
                        <kbd>3</kbd>: Single Crochet (sc)
                    </li>
                    <li>
                        <kbd>4</kbd>: Half Double Crochet (hdc)
                    </li>
                    <li>
                        <kbd>5</kbd>: Double Crochet (dc)
                    </li>
                    <li>
                        <kbd>6</kbd>: Treble Crochet (tr)
                    </li>
                    <li>
                        <kbd>7</kbd>: Double Treble Crochet (dtr)
                    </li>
                </ul>
                <h3>Move Mode Tools</h3>
                <i>Tools that are only applicable in the move editing mode</i>
                <ul>
                    <li>
                        <kbd>v</kbd>: Align stitches vertically
                    </li>
                    <li>
                        <kbd>h</kbd>: Align stitches horizontally
                    </li>
                    <li>
                        <kbd>arrow keys</kbd>: Move stitches by 1 pixel. Hold{" "}
                        <kbd>shift</kbd> to move by 10 pixels.
                    </li>
                </ul>
                <h3>Miscellaneous</h3>
                <ul>
                    <li>
                        <kbd>space</kbd>: Toggle crochet path
                    </li>
                    <li>
                        <kbd>e</kbd>: Export pattern
                    </li>
                </ul>
            </div>
        </div>
    );
}
