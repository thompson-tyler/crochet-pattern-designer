import p5 from "p5";
import React, { useEffect } from "react";

export default function Sketcher(props: { sketch: (p: p5) => void }) {
    const { sketch } = props;
    const divRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<p5 | null>(null);

    useEffect(() => {
        if (divRef.current === null) return;
        canvasRef.current = new p5(sketch, divRef.current);
        return () => {
            canvasRef.current?.remove();
            canvasRef.current = null;
        };
    }, [sketch]);

    return <div ref={divRef} />;
}
