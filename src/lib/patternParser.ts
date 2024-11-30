import p5 from "p5";
import { Stitch } from "./types";

export function stitchesToJSON(stitches: Stitch[]): string {
    const exportableStitches = stitches.map((s, i) => ({
        id: i,
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
    // An intermediate representation with numeric id references instead of object references
    const stitchesWithIds: {
        stitch: Stitch;
        id: number;
        parentId: number | null;
        baseId: number | null;
    }[] = [];
    for (const stitch of json) {
        // Validate the stitch
        if (stitch.id === undefined || typeof stitch.id !== "number") {
            throw new Error("Stitch has invalid id");
        }
        if (stitch.x === undefined || typeof stitch.x !== "number") {
            throw new Error(`Stitch (id=${stitch.id}) has invalid x`);
        }
        if (stitch.y === undefined || typeof stitch.y !== "number") {
            throw new Error(`Stitch (id=${stitch.id}) has invalid y`);
        }
        if (
            stitch.parent === undefined ||
            (stitch.parent !== null && typeof stitch.parent !== "number")
        ) {
            throw new Error(`Stitch (id=${stitch.id}) has invalid parent`);
        }
        if (
            stitch.base === undefined ||
            (stitch.base !== null && typeof stitch.base !== "number")
        ) {
            throw new Error(`Stitch (id=${stitch.id}) has invalid base`);
        }
        if (stitch.type === undefined || typeof stitch.type !== "number") {
            throw new Error(`Stitch (id=${stitch.id}) has invalid type`);
        }
        // Construct intermediate representation
        stitchesWithIds.push({
            stitch: {
                pos: p5.Vector.fromAngle(0).set(stitch.x, stitch.y),
                parent: null,
                base: null,
                type: stitch.type,
            },
            id: stitch.id,
            parentId: stitch.parent,
            baseId: stitch.base,
        });
    }
    // Construct full stitch objects
    const stitches = stitchesWithIds.map((sWithIds) => {
        const stitch = sWithIds.stitch;
        const parent =
            sWithIds.parentId === null
                ? null
                : stitchesWithIds.find((s) => s.id === sWithIds.parentId);
        if (parent === undefined) {
            throw new Error(
                `Stitch (id=${sWithIds.id}) has invalid parent id=${sWithIds.parentId}`
            );
        }
        const base =
            sWithIds.baseId === null
                ? null
                : stitchesWithIds.find((s) => s.id === sWithIds.baseId);
        if (base === undefined) {
            throw new Error(
                `Stitch (id=${sWithIds.id}) has invalid base id=${sWithIds.baseId}`
            );
        }
        stitch.parent = parent ? parent.stitch : null;
        stitch.base = base ? base.stitch : null;
        return stitch;
    });
    return stitches;
}
