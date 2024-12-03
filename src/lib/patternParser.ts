import p5 from "p5";
import { Stitch } from "./types";

export function stitchesToJSON(stitches: Stitch[]): string {
    const exportableStitches = stitches.map((s) => ({
        x: s.pos.x,
        y: s.pos.y,
        parent: s.parent ? stitches.indexOf(s.parent) : null,
        base: s.base ? stitches.indexOf(s.base) : null,
        type: s.type,
    }));
    return JSON.stringify(exportableStitches);
}

export function jsonToStitches(jsonString: string): Stitch[] {
    const json = JSON.parse(jsonString);
    if (!Array.isArray(json)) throw new Error("JSON is not an array");
    // Construct stitches without references
    const stitches: Stitch[] = json.map((stitch: any) => {
        // Validate the stitch
        if (stitch.x === undefined || typeof stitch.x !== "number")
            throw new Error(`Stitch (id=${stitch.id}) has invalid x`);
        if (stitch.y === undefined || typeof stitch.y !== "number")
            throw new Error(`Stitch (id=${stitch.id}) has invalid y`);
        if (
            stitch.parent === undefined ||
            (stitch.parent !== null && typeof stitch.parent !== "number")
        )
            throw new Error(`Stitch (id=${stitch.id}) has invalid parent`);
        if (
            stitch.base === undefined ||
            (stitch.base !== null && typeof stitch.base !== "number")
        )
            throw new Error(`Stitch (id=${stitch.id}) has invalid base`);
        if (stitch.type === undefined || typeof stitch.type !== "number")
            throw new Error(`Stitch (id=${stitch.id}) has invalid type`);
        return {
            pos: p5.Vector.fromAngle(0).set(stitch.x, stitch.y),
            parent: null,
            base: null,
            type: stitch.type,
        };
    });
    // Assign references
    stitches.forEach((stitch, i) => {
        const imported = json[i];
        stitch.parent =
            imported.parent === null ? null : stitches[imported.parent];
        stitch.base = imported.base === null ? null : stitches[imported.base];
    });
    return stitches;
}
