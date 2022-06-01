import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { RootLayerContext } from "./OverlayPortal";
import { Placement } from "./TooltipConstants";
import { OverlayOffset } from "./TooltipOffsetContainer";

const Trigger = {
  hover: "hover",
  click: "click",
} as const;

type Props = {
  layoutId: string;
  placement?: Placement;
  children?: (renderProps: { triggerProps: TriggerProps }) => React.ReactNode;
  render: JSX.Element;
  trigger?: typeof Trigger[keyof typeof Trigger];
};

type TriggerProps = {
  ref: (ref: HTMLElement | null) => void;
  onClick?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  tabIndex: 0;
  cursor: "pointer";
};

export const TooltipRenderer = (props: Props) => {
  const {
    layoutId = "tooltip",
    trigger = Trigger.hover,
    children,
    placement = "vertical",
    render,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect>();
  const [active, setActive] = useState(false);
  const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null);

  const onMouseEnter = useCallback(() => {
    if (!triggerRef) return;

    const domRect = triggerRef.getBoundingClientRect();
    setTriggerRect(domRect);
    if (trigger === Trigger.hover) {
      setActive(true);
    }
  }, [trigger, triggerRef]);

  useEffect(() => {
    if (!active) return;

    const onClick = (e: MouseEvent) => {
      const overlayContainer = containerRef.current;
      const clickedNode = e.target as Node;
      if (
        overlayContainer &&
        clickedNode &&
        !overlayContainer.contains(clickedNode)
      ) {
        setActive(false);
      }
    };

    // if we add the handled to current callstack the listener gets called
    // immediately which is not the intention
    setTimeout(() => {
      window.addEventListener("click", onClick);
    });

    return () => {
      window.removeEventListener("click", onClick);
    };
  }, [active]);

  const onClick = useCallback(() => {
    if (trigger === Trigger.click) {
      setActive(true);
    }
  }, [trigger]);

  useEffect(() => {
    if (!triggerRef) return;
    const domRect = triggerRef.getBoundingClientRect();
    setTriggerRect(domRect);
  }, [triggerRef]);

  const onMouseLeave = useCallback(() => {
    if (trigger === Trigger.hover) {
      setActive(false);
    }
  }, [trigger]);

  const onTooltipLeave = useCallback(() => {
    if (trigger === Trigger.hover) {
      setActive(false);
    }
  }, [trigger]);

  useEffect(() => {
    const onBlur = () => {
      // setActive(false);
    };
    window.addEventListener("scroll", onBlur);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("scroll", onBlur);
      window.removeEventListener("blur", onBlur);
    };
  }, [active]);

  const root = useContext(RootLayerContext).rootLayerRef?.current;

  return !children ? null : (
    <>
      {children({
        triggerProps: {
          tabIndex: 0,
          ref: setTriggerRef,
          onMouseEnter,
          onClick: trigger === Trigger.click ? onClick : undefined,
          onMouseLeave,
          cursor: "pointer",
        },
      })}

      {active &&
        triggerRect &&
        root &&
        createPortal(
          <OverlayOffset
            layoutId={layoutId}
            containerRef={containerRef}
            render={render}
            triggerRect={triggerRect}
            placement={placement}
            onMouseLeave={onTooltipLeave}
          />,
          root,
        )}
    </>
  );
};
