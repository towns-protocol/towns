import clsx from "clsx";
import React, { forwardRef, useMemo } from "react";
import { absoluteFillClass } from "../../styles/utils.css";
import { Sprinkles, sprinkles } from "./Box.css";

type Props = {
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  border?: boolean | Sprinkles["border"];
  basis?: number | string;
  grow?: boolean | Sprinkles["flexGrow"];
  shrink?: boolean | Sprinkles["flexShrink"];
  absoluteFill?: boolean;
  centerContent?: boolean;
} & Sprinkles;

const toPx = (value?: string | number) =>
  typeof value === "number" ? `${value}px` : value;
function notUndefined<T>(x: T | undefined): x is T {
  return typeof x !== "undefined";
}

const boxDefaults: Sprinkles = {
  display: "flex",
  direction: "column",
} as const;

export const Box = forwardRef<HTMLElement, Props>((props: Props, ref) => {
  const {
    as = "div",
    className,
    children,
    centerContent,
    grow,
    shrink,
    basis,
    absoluteFill,
    style,
    ...sprinkleProps
  } = props;

  // TODO: filter const sprinkleProps via `sprinkles.properties.has` to avoid
  // runtime errors

  const fromShorthand = useMemo(() => {
    const shorthands: Sprinkles = {};

    if (notUndefined(grow)) {
      shorthands.flexGrow =
        typeof grow === "boolean" ? (grow ? "x1" : "x0") : grow;
    }
    if (notUndefined(shrink)) {
      shorthands.flexShrink =
        typeof shrink === "boolean" ? (shrink ? "x1" : "x0") : shrink;
    }
    if (centerContent === true) {
      shorthands.justifyContent = "center";
      shorthands.alignItems = "center";
    }
    return shorthands;
  }, [centerContent, grow, shrink]);

  const generatedClassName = useMemo(
    () =>
      clsx(
        absoluteFill && absoluteFillClass,
        sprinkles({
          ...boxDefaults,
          ...fromShorthand,
          ...sprinkleProps,
        }),
        className
      ),
    [absoluteFill, className, fromShorthand, sprinkleProps]
  );

  const dynamicStyle = useMemo(() => {
    const style: React.CSSProperties = props.style ?? {};
    if (notUndefined(basis)) {
      style.flexBasis = toPx(basis);
    }
    return style;
  }, [basis, props.style]);

  return React.createElement(
    as,
    {
      className: generatedClassName,
      style: dynamicStyle,
      ref,
    },
    children
  );
});

export type BoxProps = Parameters<typeof Box>[0];
