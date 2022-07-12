import { motion } from "framer-motion";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, BoxProps } from "../Box/Box";
import { Placement } from "./TooltipConstants";

type OffsetContainerProps = {
  layoutId: string;
  placement: Placement;
  render: JSX.Element;
  triggerRect: DOMRect;
  distance?: BoxProps["padding"];
  animatePresence?: boolean;
  onMouseLeave: () => void;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;

  containerBounds?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export const OverlayOffset = (props: OffsetContainerProps) => {
  const {
    triggerRect,
    render,
    placement,
    containerRef,
    distance = "md",
    layoutId = "tooltip",
  } = props;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const ref = useRef<HTMLDivElement>(null);
  containerRef.current = ref.current;

  const containerBounds = useMemo(() => {
    return (
      // default to window
      props.containerBounds ?? {
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        left: 0,
      }
    );
  }, [props.containerBounds]);

  const style = useMemo(() => {
    if (!triggerRect) return undefined;

    const baseStyle = {
      // pointerEvent:  "none",
      position: "absolute",
    } as const;

    const pos = {
      left: 0,
      top: 0,
    };

    if (placement === "horizontal") {
      pos.top = triggerRect.top + triggerRect.height * 0.5 - size.height * 0.5;
      pos.left = triggerRect.right;
    } else {
      pos.top = triggerRect.bottom;
      pos.left = triggerRect.left + triggerRect.width * 0.5 - size.width * 0.5;
    }

    pos.left = Math.max(
      containerBounds.left,
      Math.min(containerBounds.right - size.width, pos.left),
    );

    pos.top = Math.max(
      containerBounds.top,
      Math.min(containerBounds.bottom - size.width, pos.top),
    );

    return {
      ...baseStyle,
      ...pos,
    };
  }, [placement, size, triggerRect, containerBounds]);

  useLayoutEffect(() => {
    const domRect = ref.current?.getBoundingClientRect();
    if (domRect) {
      setSize({ width: domRect.width, height: domRect.height });
    }
  }, [ref]);

  const content = (
    <Box padding={distance} ref={ref} onMouseLeave={props.onMouseLeave}>
      {render}
    </Box>
  );

  return size.width === 0 ? (
    <div style={style}>{content}</div>
  ) : (
    <motion.div {...layoutAnimation} layoutId={layoutId} style={style}>
      <motion.div>{content}</motion.div>
    </motion.div>
  );
};

const layoutAnimation = {
  layout: "position",
  transition: { type: "spring", stiffness: 500, damping: 30 },
} as const;
