import p5 from "p5";
import { Stitch, StitchType } from "../lib/types";
import Sketcher from "./Sketcher";
import { stitchesToJSON } from "../lib/patternParser";

enum EditingMode {
    Adding,
    Moving,
    Deleting,
    Inserting,
    Viewing,
    Rebasing,
}

type DragState = {
    stitch: Stitch;
    start: p5.Vector;
};

type SelectionBox = {
    start: p5.Vector;
    end: p5.Vector;
};

export default function PatternSketcher({
    importedPattern,
}: {
    importedPattern: Stitch[] | null;
}) {
    const sketch = (p: p5) => {
        const SKETCH_WIDTH = 800;
        const SKETCH_HEIGHT = 600;
        const HOVER_RADIUS = 20;
        const ANCHOR_DOT_RADIUS = 12;
        const SLIP_STITCH_RADIUS = 8;
        const INTER_STITCH_SPACE = 8;

        const BACKGROUND_COLOR = p.color(255);
        const STITCH_COLOR = p.color(0);
        const STITCH_HIGHLIGHT_COLOR = p.color("red");
        const ANCHOR_OUTLINE_COLOR = p.color("gray");
        const ANCHOR_HOVER_COLOR = p.color("gray");
        const STITCH_SELECTED_COLOR = p.color("green");
        const STITCH_GHOST_COLOR = p.color("gray");
        const TEXT_COLOR = p.color(0);
        const CROCHET_PATH_COLOR = p.color("red");
        const DRAG_SELECTION_BOX_COLOR = p.color("green");
        const GROUP_SELECTION_COLOR = p.color("green");

        const FIRST_STITCH: Stitch =
            importedPattern !== null
                ? importedPattern[0]
                : {
                      pos: p.createVector(SKETCH_WIDTH / 2, SKETCH_HEIGHT / 2),
                      parent: null,
                      base: null,
                      type: StitchType.Slip,
                  };
        let stitches =
            importedPattern !== null ? importedPattern : [FIRST_STITCH];
        let nextParent = stitches[stitches.length - 1];

        let mode = EditingMode.Adding;
        let stitchType = StitchType.Chain;
        let hovering: Stitch | null = null;
        let dragging: DragState | null = null;
        let detailedView = false;
        let groupSelection = new Set<Stitch>();
        let dragSelectionBox: SelectionBox | null = null;

        const exportPattern = () => {
            const jsonString = stitchesToJSON(stitches);
            const filename =
                "exported pattern - " +
                new Date().toISOString().split(".").shift() +
                ".json";
            // Create a blob and download it
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        };

        const setDragging = (stitch: Stitch) =>
            (dragging = { stitch, start: p.createVector(p.mouseX, p.mouseY) });
        const draggingStitch = () => (dragging ? dragging.stitch : null);

        const setMode = (m: EditingMode) => {
            groupSelection.clear();
            if (mode === m) mode = EditingMode.Viewing;
            else mode = m;
        };

        const makeStitch = (
            x: number,
            y: number,
            parent: Stitch = nextParent,
            base: Stitch | null = draggingStitch(),
            type: StitchType = stitchType
        ) => {
            const newStitch = {
                pos: p.createVector(x, y),
                parent,
                base,
                type,
            };
            // If a stitch was referencing the selected parent, reassign it to the new stitch
            const child = stitches.find((s) => s.parent === nextParent);
            if (child) child.parent = newStitch;
            // Push the new stitch to the stitches array
            stitches.push(newStitch);
            // Increment the next parent to the new stitch
            nextParent = newStitch;
        };

        const deleteStitch = (stitch: Stitch) => {
            if (stitch === FIRST_STITCH) return;
            // If a stitch was using this stitch as a base, reassign its base to the deleted stitch's base, if possible. Otherwise, reassign it to the next parent
            stitches
                .filter((s) => s.base === stitch)
                .forEach((s) => (s.base = stitch.base || stitch.parent));
            // If a stitch was using this stitch as a parent, reassign its parent to the previous stitch
            stitches
                .filter((s) => s.parent === stitch)
                .forEach((s) => (s.parent = stitch.parent || FIRST_STITCH));
            // If this stitch is the next parent, reassign next parent to the previous stitch
            if (nextParent === stitch)
                nextParent = stitch.parent || FIRST_STITCH;
            // Remove the stitch
            stitches = stitches.filter((s) => s !== stitch);
        };

        const canDrag = (stitch: Stitch, m: EditingMode = mode): boolean => {
            switch (m) {
                case EditingMode.Moving:
                case EditingMode.Inserting:
                    return true;
                case EditingMode.Deleting:
                    return stitch !== FIRST_STITCH;
                case EditingMode.Viewing:
                    return false;
                case EditingMode.Rebasing:
                    return dragging
                        ? stitch !== dragging.stitch
                        : stitch.type !== StitchType.Chain &&
                              stitch.type !== StitchType.Slip;
                case EditingMode.Adding:
                    switch (stitchType) {
                        case StitchType.Chain:
                            return stitch === nextParent;
                        case StitchType.Slip:
                        case StitchType.SingleCrochet:
                        case StitchType.HalfDoubleCrochet:
                        case StitchType.DoubleCrochet:
                        case StitchType.TrebleCrochet:
                        case StitchType.DoubleTrebleCrochet:
                            return stitch !== nextParent;
                    }
            }
        };

        const attachAnchor = (stitch: Stitch): p5.Vector => {
            switch (stitch.type) {
                case StitchType.Chain:
                    return middleAnchor(stitch);
                case StitchType.Slip:
                case StitchType.SingleCrochet:
                case StitchType.HalfDoubleCrochet:
                case StitchType.DoubleCrochet:
                case StitchType.TrebleCrochet:
                case StitchType.DoubleTrebleCrochet:
                    return headAnchor(stitch);
            }
        };

        const headAnchor = (stitch: Stitch) => stitch.pos;

        function middleAnchor(stitch: Stitch): p5.Vector {
            switch (stitch.type) {
                case StitchType.Slip:
                    return headAnchor(stitch);
                case StitchType.Chain:
                    return stitch.parent === null
                        ? headAnchor(stitch)
                        : p5.Vector.add(
                              headAnchor(stitch.parent),
                              stitch.pos
                          ).div(2);
                case StitchType.SingleCrochet:
                case StitchType.HalfDoubleCrochet:
                case StitchType.DoubleCrochet:
                case StitchType.TrebleCrochet:
                case StitchType.DoubleTrebleCrochet:
                    return stitch.base === null
                        ? headAnchor(stitch)
                        : p5.Vector.add(
                              attachAnchor(stitch.base),
                              stitch.pos
                          ).div(2);
            }
        }

        function anchorForMode(stitch: Stitch): p5.Vector {
            switch (mode) {
                case EditingMode.Moving:
                case EditingMode.Viewing:
                case EditingMode.Inserting:
                    return headAnchor(stitch);
                case EditingMode.Deleting:
                    return middleAnchor(stitch);
                case EditingMode.Rebasing:
                    return dragging
                        ? attachAnchor(stitch)
                        : middleAnchor(stitch);
                case EditingMode.Adding:
                    if (stitch === nextParent) return headAnchor(stitch);
                    return attachAnchor(stitch);
            }
        }

        function drawSlipStitch(stitch: Stitch) {
            const { x, y } = headAnchor(stitch);
            p.ellipse(x, y, SLIP_STITCH_RADIUS);
        }

        function drawChainStitch(stitch: Stitch) {
            if (stitch.parent === null) {
                console.warn("Tried to draw chain stitch with no parent");
                return;
            }

            const { x, y } = headAnchor(stitch);
            const { x: px, y: py } = headAnchor(stitch.parent);
            const d = p.dist(x, y, px, py);
            const { x: ax, y: ay } = middleAnchor(stitch);

            p.push();
            p.translate(ax, ay);
            p.rotate(p.atan2(y - py, x - px));
            p.ellipse(0, 0, d - INTER_STITCH_SPACE, 8 + d * 0.1);
            p.pop();
        }

        function drawSingleCrochetSitch(stitch: Stitch) {
            if (stitch.base === null) {
                console.warn(
                    "Tried to draw single crochet stitch with no base"
                );
                return;
            }

            const { x, y } = headAnchor(stitch);
            const { x: bx, y: by } = attachAnchor(stitch.base);
            const d = p.dist(x, y, bx, by);
            const l = d - INTER_STITCH_SPACE;

            p.push();
            p.translate(bx, by);
            p.rotate(p.atan2(y - by, x - bx));
            p.translate(INTER_STITCH_SPACE / 2, 0);
            p.line(0, 0, l, 0);
            p.line(l / 2, 10, l / 2, -10);
            p.pop();
        }

        function drawLongStitchWithHashes(stitch: Stitch, nHashes: number) {
            if (stitch.base === null) {
                console.warn(
                    `Tried to draw ${stitch.type} stitch with no base`
                );
                return;
            }
            if (stitch.parent === null) {
                console.warn(
                    `Tried to draw half ${stitch.type} stitch with no parent`
                );
                return;
            }

            const { x, y } = headAnchor(stitch);
            const { x: px, y: py } = headAnchor(stitch.parent);
            const { x: bx, y: by } = attachAnchor(stitch.base);
            const d = p.dist(x, y, bx, by);
            const l = d - INTER_STITCH_SPACE;
            const angleToBase = p.atan2(y - by, x - bx);

            // Draw stitch spine to base
            p.push();
            p.translate(x, y);
            p.rotate(angleToBase);
            p.translate(-INTER_STITCH_SPACE / 2, 0);
            p.line(0, 0, -l, 0);
            for (let i = 0; i < nHashes; i++) {
                const c = (-l * (2 + i)) / 12; // center of hash along stitch spine
                p.line(c + 5, -5, c - 5, 5);
            }

            // draw head in-line with parent position
            p.rotate(-angleToBase);
            p.rotate(p.atan2(y - py, x - px));
            p.line(10, 0, -10, 0);
            p.pop();
        }

        function drawHalfDoubleCrochetStitch(stitch: Stitch) {
            drawLongStitchWithHashes(stitch, 0);
        }

        function drawDoubleCrochetStitch(stitch: Stitch) {
            drawLongStitchWithHashes(stitch, 1);
        }

        function drawTrebleCrochetStitch(stitch: Stitch) {
            drawLongStitchWithHashes(stitch, 2);
        }

        function drawDoubleTrebleCrochetStitch(stitch: Stitch) {
            drawLongStitchWithHashes(stitch, 3);
        }

        function drawStitch(stitch: Stitch) {
            switch (stitch.type) {
                case StitchType.Chain:
                    return drawChainStitch(stitch);
                case StitchType.SingleCrochet:
                    return drawSingleCrochetSitch(stitch);
                case StitchType.HalfDoubleCrochet:
                    return drawHalfDoubleCrochetStitch(stitch);
                case StitchType.DoubleCrochet:
                    return drawDoubleCrochetStitch(stitch);
                case StitchType.Slip:
                    return drawSlipStitch(stitch);
                case StitchType.TrebleCrochet:
                    return drawTrebleCrochetStitch(stitch);
                case StitchType.DoubleTrebleCrochet:
                    return drawDoubleTrebleCrochetStitch(stitch);
            }
        }

        p.setup = () => {
            p.createCanvas(SKETCH_WIDTH, SKETCH_HEIGHT);
            p.rectMode(p.CORNERS);
        };

        p.draw = () => {
            p.background(BACKGROUND_COLOR);

            // Draw stitches and detect hovering
            hovering = null;
            for (const stitch of stitches) {
                // Calculate distance from mouse to stitch anchor and check if it's a candidate for hovering
                const { x: ax, y: ay } = anchorForMode(stitch);
                const d = p.dist(p.mouseX, p.mouseY, ax, ay);
                let dPrev = undefined;
                if (hovering === null) dPrev = Infinity;
                else {
                    const { x, y } = anchorForMode(hovering);
                    dPrev = p.dist(p.mouseX, p.mouseY, x, y);
                }
                if (canDrag(stitch) && d < HOVER_RADIUS && d < dPrev)
                    hovering = stitch;

                // Draw stitch
                const parentHighlight = stitch === nextParent;
                // Set stroke
                parentHighlight && !(mode === EditingMode.Viewing)
                    ? p.stroke(STITCH_HIGHLIGHT_COLOR)
                    : p.stroke(STITCH_COLOR);
                // Set fill
                stitch.type === StitchType.Slip
                    ? parentHighlight && !(mode === EditingMode.Viewing)
                        ? p.fill(STITCH_HIGHLIGHT_COLOR)
                        : p.fill(STITCH_COLOR)
                    : p.noFill();
                drawStitch(stitch);
            }

            // Draw anchor nodes
            for (const stitch of stitches) {
                // Draw drag anchor, if applicable
                p.noStroke();
                p.noFill();
                if (canDrag(stitch)) {
                    if (
                        mode === EditingMode.Moving &&
                        groupSelection.has(stitch)
                    ) {
                        p.fill(STITCH_SELECTED_COLOR);
                    } else if (stitch === hovering) {
                        p.fill(ANCHOR_HOVER_COLOR);
                    } else {
                        p.stroke(ANCHOR_OUTLINE_COLOR);
                    }
                    const { x, y } = anchorForMode(stitch);
                    p.ellipse(x, y, ANCHOR_DOT_RADIUS);
                }
            }

            // Handle dragging
            if (dragging !== null) {
                switch (mode) {
                    case EditingMode.Adding:
                        const addingGhost = {
                            pos: p.createVector(p.mouseX, p.mouseY),
                            parent: nextParent,
                            base: dragging.stitch,
                            type: stitchType,
                        };
                        p.stroke(STITCH_GHOST_COLOR);
                        p.noFill();
                        drawStitch(addingGhost);
                        break;
                    case EditingMode.Moving:
                        const { start } = dragging;
                        groupSelection.forEach((s) => {
                            s.pos.add(
                                p.createVector(p.mouseX, p.mouseY).sub(start)
                            );
                        });
                        dragging.start = p.createVector(p.mouseX, p.mouseY);
                        break;
                    case EditingMode.Rebasing:
                        // Create a fictitious base stitch for the ghost stitch to use as its base
                        const fakeBase =
                            hovering && canDrag(hovering, EditingMode.Adding)
                                ? hovering
                                : {
                                      pos: p.createVector(p.mouseX, p.mouseY),
                                      parent: null,
                                      base: null,
                                      type: StitchType.Slip,
                                  };
                        const rebaseGhost = {
                            pos: dragging.stitch.pos,
                            parent: dragging.stitch.parent,
                            base: fakeBase,
                            type: dragging.stitch.type,
                        };
                        p.stroke(STITCH_GHOST_COLOR);
                        p.noFill();
                        drawStitch(rebaseGhost);
                        break;
                }
            }

            // Draw detailed view information
            if (detailedView) {
                for (const stitch of stitches) {
                    if (stitch.parent !== null) {
                        const { x, y } = headAnchor(stitch);
                        const { x: px, y: py } = headAnchor(stitch.parent);
                        p.stroke(CROCHET_PATH_COLOR);
                        p.line(x, y, px, py);
                    }
                }
            }

            // Draw group selection box
            if (
                mode === EditingMode.Moving &&
                groupSelection.size > 0 &&
                !dragSelectionBox
            ) {
                const { xMin, xMax, yMin, yMax } = Array.from(
                    groupSelection
                ).reduce(
                    (mins, s) => {
                        const { x, y } = anchorForMode(s);
                        return {
                            xMin: Math.min(mins.xMin, x),
                            xMax: Math.max(mins.xMax, x),
                            yMin: Math.min(mins.yMin, y),
                            yMax: Math.max(mins.yMax, y),
                        };
                    },
                    {
                        xMin: Infinity,
                        xMax: -Infinity,
                        yMin: Infinity,
                        yMax: -Infinity,
                    }
                );
                p.stroke(GROUP_SELECTION_COLOR);
                p.noFill();
                p.rect(
                    xMin - ANCHOR_DOT_RADIUS,
                    yMin - ANCHOR_DOT_RADIUS,
                    xMax + ANCHOR_DOT_RADIUS,
                    yMax + ANCHOR_DOT_RADIUS
                );
            }

            // Handle dragging selection box
            if (dragSelectionBox !== null) {
                // Update dragging selection box location
                dragSelectionBox.end = p.createVector(p.mouseX, p.mouseY);
                // Select stitches within the dragging selection box
                const { start, end } = dragSelectionBox;
                groupSelection.clear();
                for (const stitch of stitches) {
                    const { x, y } = anchorForMode(stitch);
                    const xInside =
                        (x >= start.x && x <= end.x) ||
                        (x <= start.x && x >= end.x);
                    const yInside =
                        (y >= start.y && y <= end.y) ||
                        (y <= start.y && y >= end.y);
                    if (xInside && yInside) groupSelection.add(stitch);
                }
                // Draw dragging selection box
                p.stroke(DRAG_SELECTION_BOX_COLOR);
                p.noFill();
                p.rect(start.x, start.y, end.x, end.y);
            }

            // Draw mode text
            const textSize = 15;
            p.textSize(textSize);
            p.fill(TEXT_COLOR);
            p.stroke(0, 0, 0, 0);
            const getModeText = () => {
                switch (mode) {
                    case EditingMode.Adding:
                        return "Adding";
                    case EditingMode.Moving:
                        return "Moving";
                    case EditingMode.Deleting:
                        return "Deleting";
                    case EditingMode.Inserting:
                        return "Inserting";
                    case EditingMode.Viewing:
                        return "Viewing";
                    case EditingMode.Rebasing:
                        return "Rebasing";
                }
            };
            p.text(getModeText(), 0, textSize);

            // Draw stitch type text
            const getStitchText = () => {
                switch (stitchType) {
                    case StitchType.Slip:
                        return "Slip";
                    case StitchType.Chain:
                        return "Chain";
                    case StitchType.SingleCrochet:
                        return "Single Crochet";
                    case StitchType.HalfDoubleCrochet:
                        return "Half Double Crochet";
                    case StitchType.DoubleCrochet:
                        return "Double Crochet";
                    case StitchType.TrebleCrochet:
                        return "Treble Crochet";
                    case StitchType.DoubleTrebleCrochet:
                        return "Double Treble Crochet";
                }
            };
            if (mode === EditingMode.Adding)
                p.text(getStitchText(), 0, textSize * 2);
        };

        p.mousePressed = () => {
            if (hovering === null) {
                switch (mode) {
                    case EditingMode.Moving:
                        dragSelectionBox = {
                            start: p.createVector(p.mouseX, p.mouseY),
                            end: p.createVector(p.mouseX, p.mouseY),
                        };
                        groupSelection.clear();
                        break;
                }
            } else {
                if (!canDrag(hovering)) return;
                switch (mode) {
                    case EditingMode.Moving:
                        if (p.keyIsDown(p.SHIFT)) {
                            if (!groupSelection.has(hovering))
                                groupSelection.add(hovering);
                            else groupSelection.delete(hovering);
                        } else {
                            if (!groupSelection.has(hovering))
                                groupSelection.clear();
                            groupSelection.add(hovering);
                            setDragging(hovering);
                        }
                        break;
                    case EditingMode.Adding:
                    case EditingMode.Rebasing:
                        setDragging(hovering);
                        break;
                    case EditingMode.Deleting:
                        deleteStitch(hovering);
                        break;
                    case EditingMode.Inserting:
                        nextParent = hovering;
                        mode = EditingMode.Adding;
                        break;
                }
            }
        };

        p.mouseReleased = () => {
            if (dragSelectionBox !== null) dragSelectionBox = null;
            if (dragging !== null) {
                switch (mode) {
                    case EditingMode.Adding:
                        makeStitch(p.mouseX, p.mouseY);
                        break;
                    case EditingMode.Rebasing:
                        if (hovering) dragging.stitch.base = hovering;
                        break;
                }
                dragging = null;
            }
        };

        p.keyPressed = (e: object) => {
            if (!(e instanceof KeyboardEvent)) return;
            if (dragging !== null) return;
            switch (e.key) {
                case "a":
                    setMode(EditingMode.Adding);
                    break;
                case "m":
                    setMode(EditingMode.Moving);
                    break;
                case "d":
                    setMode(EditingMode.Deleting);
                    break;
                case "i":
                    setMode(EditingMode.Inserting);
                    break;
                case "v":
                    setMode(EditingMode.Viewing);
                    break;
                case "b":
                    setMode(EditingMode.Rebasing);
                    break;
                case "1":
                    stitchType = StitchType.Chain;
                    break;
                case "2":
                    stitchType = StitchType.Slip;
                    break;
                case "3":
                    stitchType = StitchType.SingleCrochet;
                    break;
                case "4":
                    stitchType = StitchType.HalfDoubleCrochet;
                    break;
                case "5":
                    stitchType = StitchType.DoubleCrochet;
                    break;
                case "6":
                    stitchType = StitchType.TrebleCrochet;
                    break;
                case "7":
                    stitchType = StitchType.DoubleTrebleCrochet;
                    break;
                case " ":
                    detailedView = !detailedView;
                    break;
                case "e":
                    exportPattern();
                    break;
            }
        };
    };

    return <Sketcher sketch={sketch} />;
}
