import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

import { Box } from "../Box/Box";
import { Placement } from "./CardOpener";

type OffsetContainerProps = {
  placement: Placement;
  render: JSX.Element;
  triggerRect: DOMRect;
  hitPosition: [number, number] | undefined;
  animatePresence?: boolean;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  margin?: { x: number; y: number };
};

const DEBUG = false;
const defaultMargin = { x: 0, y: 0 } as const;

export const OverlayContainer = (props: OffsetContainerProps) => {
  const {
    triggerRect,
    hitPosition,
    render,
    placement,
    containerRef,
    margin = defaultMargin,
  } = props;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const ref = useRef<HTMLDivElement>(null);
  containerRef.current = ref.current;

  const isContainerEmpty = size.height === 0;

  const styles = useMemo(() => {
    const anchorStyle: { [key: string]: number | string | undefined } = {
      position: "absolute",
      border: DEBUG ? `1px solid green` : undefined,
    };

    const containerStyle: { [key: string]: number | string | undefined } = {
      position: "absolute",
      opacity: isContainerEmpty ? 0 : 1,
      border: DEBUG ? `1px solid pink` : undefined,
    };

    if (!triggerRect || (size.width === 0 && size.height === 0)) {
      return {
        anchorStyle,
        containerStyle,
      };
    }

    if (placement === "above") {
      anchorStyle.top = triggerRect.top - margin.y;
      const topDiff = Math.max(0, (size.height ?? 0) - anchorStyle.top);
      containerStyle.bottom = -topDiff;

      anchorStyle.left = triggerRect.right - margin.x;
      const leftDiff = Math.max(0, (size.width ?? 0) - anchorStyle.left);
      containerStyle.right = -leftDiff;
    }

    if (placement === "pointer" && hitPosition) {
      anchorStyle.left = hitPosition[0];
      anchorStyle.top = hitPosition[1];
    }

    return {
      anchorStyle,
      containerStyle,
    };
  }, [
    hitPosition,
    isContainerEmpty,
    margin.x,
    margin.y,
    placement,
    size.height,
    size.width,
    triggerRect,
  ]);

  useLayoutEffect(() => {
    const domRect = ref.current?.getBoundingClientRect();
    if (domRect) {
      setSize({
        width: domRect.width,
        height: domRect.height,
      });
    }
  }, [ref, triggerRect.top]);

  return (
    <>
      {/* background covering pointerevents*/}
      <Box absoluteFill pointerEvents="auto">
        {/* anchor */}
        <div style={styles?.anchorStyle}>
          {/* container */}
          <div style={styles?.containerStyle}>
            <Box ref={ref} position="relative">
              {render}
            </Box>
          </div>
        </div>
      </Box>
    </>
  );
};
