import clsx from "clsx";
import React, {
  HTMLAttributes,
  createElement,
  forwardRef,
  useMemo,
} from "react";
import { Atoms, atoms, boxStyleBase } from "ui/styles/atoms/atoms.css";
import { debugClass } from "ui/styles/css/debug.css";
import { absoluteFillClass } from "ui/styles/css/utils.css";
import { assignBoolToDefaultValue } from "ui/utils/utils";

// shorthands allow `true` or `false` for assigning default values in addition
// to the normal presets. Since bools aren't allowed as Atoms we need to
// filter them out from the type.
type OmitShorthandSprinkles = Omit<
  Atoms,
  | "border"
  | "borderTop"
  | "borderBottom"
  | "borderLeft"
  | "borderRight"
  | "padding"
>;

type ShorthandProps = {
  borderTop?: boolean | Atoms["borderTop"];
  borderBottom?: boolean | Atoms["borderBottom"];
  borderLeft?: boolean | Atoms["borderLeft"];
  borderRight?: boolean | Atoms["borderRight"];
  border?: boolean | Atoms["border"];
  padding?: boolean | Atoms["padding"];
  grow?: boolean | Atoms["flexGrow"];
  shrink?: boolean | Atoms["flexShrink"];
};

type Props = {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  absoluteFill?: boolean;
  centerContent?: boolean;
  debug?: boolean;
} & ShorthandProps &
  OmitShorthandSprinkles &
  /* TODO: possible to match with typeof `as` ? */
  HTMLAttributes<HTMLDivElement>;

const boxDefaults: Atoms = {
  display: "flex",
  direction: "column",
} as const;

export const Box = forwardRef<HTMLElement, Props>((props: Props, ref) => {
  const {
    as = "div",
    className,
    children,
    centerContent,
    debug,
    grow,
    shrink,
    absoluteFill,
    borderTop,
    borderBottom,
    borderLeft,
    borderRight,
    border,
    padding,
    style,
    ...restProps
  } = props;

  const fromShorthand = useMemo(() => {
    const shorthands: Atoms = {};

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

  const { atomicClasses, nativeProps } = useMemo(() => {
    const nativeProps: Record<string, unknown> = {};
    const atomicProps = (
      Object.keys(restProps) as Array<keyof OmitShorthandSprinkles>
    ).reduce((keep: Record<string, unknown>, k) => {
      if (atoms.properties.has(k) && typeof k !== "undefined") {
        keep[k] = restProps[k];
      } else {
        nativeProps[k] = restProps[k];
      }
      return keep;
    }, {} as Atoms);

    return {
      nativeProps,
      atomicClasses: clsx(
        boxStyleBase,
        atoms({
          ...boxDefaults,
          ...fromShorthand,
          ...atomicProps,
        }),

        absoluteFill && absoluteFillClass,
        className,
        debug && debugClass
      ),
    };
  }, [absoluteFill, className, debug, fromShorthand, restProps]);

  // const dynamicStyle = useMemo(() => {
  //   const style: React.CSSProperties = props.style ?? {};
  //   if (notUndefined(basis)) {
  //     style.flexBasis = toPx(basis);
  //   }
  //   return style;
  // }, [basis, props.style]);

  return createElement(
    as,
    {
      className: atomicClasses,
      style: props.style,
      ...nativeProps,
      ref,
    },
    children
  );
});

export type BoxProps = Parameters<typeof Box>[0];
