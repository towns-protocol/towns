import clsx from "clsx";
import React, { forwardRef, useMemo } from "react";
import { Sprinkles, sprinkles } from "../../styles/sprinkles.css";
import { absoluteFillClass } from "../../styles/utils.css";

// shorthands allow `true` or `false` for assigning default values in addition
// to the normal presets. Since bools aren't allowed as sprinkles we need to
// filter them out from the type.
type OmitShorthandSprinkles = Omit<
  Sprinkles,
  | "border"
  | "borderTop"
  | "borderBottom"
  | "borderLeft"
  | "borderRight"
  | "padding"
>;

type ShorthandProps = {
  borderTop?: boolean | Sprinkles["borderTop"];
  borderBottom?: boolean | Sprinkles["borderBottom"];
  borderLeft?: boolean | Sprinkles["borderLeft"];
  borderRight?: boolean | Sprinkles["borderRight"];
  border?: boolean | Sprinkles["border"];
  padding?: boolean | Sprinkles["padding"];
  grow?: boolean | Sprinkles["flexGrow"];
  shrink?: boolean | Sprinkles["flexShrink"];
};

type Props = {
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  basis?: number | string;
  absoluteFill?: boolean;
  centerContent?: boolean;
} & ShorthandProps &
  OmitShorthandSprinkles;

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
    borderTop,
    borderBottom,
    borderLeft,
    borderRight,
    border,
    padding,
    style,
    ...sprinkleProps
  } = props;

  const fromShorthand = useMemo(() => {
    const shorthands: Sprinkles = {};

    shorthands.border = assignBoolToDefaultValue(border, "default");
    shorthands.borderTop = assignBoolToDefaultValue(borderTop, "default");
    shorthands.borderBottom = assignBoolToDefaultValue(borderBottom, "default");
    shorthands.borderLeft = assignBoolToDefaultValue(borderLeft, "default");
    shorthands.borderRight = assignBoolToDefaultValue(borderRight, "default");
    shorthands.padding = assignBoolToDefaultValue(padding, "sm");
    shorthands.flexGrow = assignBoolToDefaultValue(grow, "x1", "x0");
    shorthands.flexShrink = assignBoolToDefaultValue(shrink, "x1", "x0");

    if (centerContent === true) {
      shorthands.justifyContent = "center";
      shorthands.alignItems = "center";
    }

    return shorthands;
  }, [
    border,
    borderBottom,
    borderLeft,
    borderRight,
    borderTop,
    centerContent,
    grow,
    padding,
    shrink,
  ]);

  const generatedClassName = useMemo(() => {
    const filteredSprinkleProps = (
      Object.keys(sprinkleProps) as Array<keyof OmitShorthandSprinkles>
    ).reduce((keep: Record<string, unknown>, k) => {
      if (sprinkles.properties.has(k) && typeof k !== "undefined") {
        keep[k] = sprinkleProps[k];
      } else {
        if (process.env.NODE_ENV === "development") {
          // throw new Error(`[Box] Warning - unknown prop "${k}"`);
        }
      }
      return keep;
    }, {} as Sprinkles);

    return clsx(
      absoluteFill && absoluteFillClass,
      sprinkles({
        ...boxDefaults,
        ...fromShorthand,
        ...filteredSprinkleProps,
      }),
      className
    );
  }, [absoluteFill, className, fromShorthand, sprinkleProps]);

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

/**
 * Utility to assign default string values if the incoming value is a bool.
 */
function assignBoolToDefaultValue<T>(
  value: boolean | T,
  trueValue: T,
  falseValue?: T
) {
  return typeof value !== "boolean"
    ? value
    : value === true
    ? trueValue
    : falseValue;
}

export type BoxProps = Parameters<typeof Box>[0];
