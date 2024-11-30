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

    return (
        <div>
            <h1>Crochet Pattern Designer</h1>
            {patternSketcher}

            <label htmlFor="import-pattern">Import pattern: </label>
            <input
                id="import-pattern"
                type="file"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    try {
                        const stitches = jsonToStitches(text);
                        setImportedPattern(stitches);
                    } catch (e: any) {
                        alert(
                            "Could not parse pattern" +
                                (e.message ? `:\n${e.message}` : "")
                        );
                    } finally {
                        e.target.value = "";
                    }
                }}
            />
        </div>
    );
}
