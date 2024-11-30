import p5 from "p5";

export type Stitch = {
    pos: p5.Vector;
    parent: Stitch | null;
    base: Stitch | null;
    type: StitchType;
};

export enum StitchType {
    Chain,
    SingleCrochet,
    HalfDoubleCrochet,
    DoubleCrochet,
    TrebleCrochet,
    DoubleTrebleCrochet,
    Slip,
}
