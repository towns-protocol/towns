import clsx from "clsx";
import { motion } from "framer-motion";
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Box } from "../Box/Box";
import { TopLayerPortalContext } from "../Overlay/OverlayPortal";
import { Stack, StackProps } from "../Stack/Stack";
import * as style from "./Tooltip.css";

type Placement = "horizontal" | "vertical";

type Props = {
  id: string;
  placement?: Placement;
  children?: (renderProps: { triggerProps: TriggerProps }) => React.ReactNode;
  render: JSX.Element;
};

type TriggerProps = {
  ref: (ref: HTMLElement | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;

  tabIndex: 0;
};

export const TooltipRenderer = ({
  id,
  children,
  placement = "vertical",
  render,
}: Props) => {
  const [triggerRect, setTriggerRect] = useState<DOMRect>();
  const [active, setActive] = useState(false);
  const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null);

  const onMouseEnter = useCallback(() => {
    if (!triggerRef) return;
    const domRect = triggerRef.getBoundingClientRect();
    setTriggerRect(domRect);
    setActive(true);
  }, [triggerRef]);

  const onMouseLeave = useCallback(() => {
    setActive(false);
  }, []);

  useEffect(() => {
    if (!active) {
      setTriggerRect(undefined);
      return;
    }
    const onBlur = () => {
      setActive(false);
    };
    window.addEventListener("scroll", onBlur);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("scroll", onBlur);
      window.removeEventListener("blur", onBlur);
    };
  }, [active]);

  const { rootRef } = useContext(TopLayerPortalContext);

  const root = rootRef?.current;

  return !children ? null : (
    <>
      {children({
        triggerProps: {
          tabIndex: 0,
          ref: setTriggerRef,
          onMouseEnter,
          onMouseLeave,
        },
      })}

      {active &&
        triggerRect &&
        root &&
        createPortal(
          <OffsetContainer
            id={id}
            key={id}
            render={render}
            triggerRect={triggerRect}
            placement={placement}
          />,
          root
        )}
    </>
  );
};

type OffsetContainerProps = {
  id: string;
  placement: Placement;
  render: JSX.Element;
  triggerRect: DOMRect;
  containerBounds?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

const OffsetContainer = (props: OffsetContainerProps) => {
  const { id, triggerRect, render, placement } = props;
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  const ref = useRef<HTMLElement>(null);

  const positionStyle = useMemo(() => {
    if (!triggerRect) return undefined;

    const baseStyle = {
      pointerEvent: "none",
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
      Math.min(containerBounds.right - size.width, pos.left)
    );

    pos.top = Math.max(
      containerBounds.top,
      Math.min(containerBounds.bottom - size.width, pos.top)
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
  }, []);

  const content = (
    <Box ref={ref} style={{ pointerEvents: "none" }}>
      {render}
    </Box>
  );

  const style = { position: "absolute", ...positionStyle } as const;

  return size.width === 0 ? (
    <div style={style}>{content}</div>
  ) : (
    <motion.div {...layoutAnimation} key={id} style={style}>
      {content}
    </motion.div>
  );
};

const layoutAnimation = {
  layout: "position",
  layoutId: "tooltip",
  transition: { type: "spring", stiffness: 500, damping: 30 },
} as const;

export const Tooltip = ({
  id,
  children,
  ...boxProps
}: { id: string; children: React.ReactNode } & StackProps) => (
  <Stack
    key={id}
    paddingX="sm"
    paddingY="xs"
    background="default"
    color="gray2"
    rounded="sm"
    fontSize="sm"
    className={clsx(style.tooltip, style.arrowLeft)}
    {...boxProps}
  >
    {children}
  </Stack>
);

// const presence = {
//   initial: {
//     opacity: 0,
//   },
//   animate: {
//     opacity: 1,
//     transition: { delay: 0.3 },
//   },
//   exit: {
//     transition: { duration: 0.1 },
//   },
// };
