import clsx from "clsx";
import React, { forwardRef, useMemo } from "react";
import { textSprinkles, TextSprinkles } from "./Text.css";

type Props = {
  // HTML representation
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5";
  // HTML class name
  className?: string;
  // React child nodes
  children?: React.ReactNode;
  // Size token
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
} & TextSprinkles;

export type TextProps = Props;

export const Text = forwardRef<HTMLElement, Props>((props: Props, ref) => {
  const {
    as = "p",
    size = "md",
    fontWeight = "normal",
    textTransform = "none",
    children,
    className,
    ...textProps
  } = props;
  const generatedClassName = useMemo(() => {
    return clsx(
      textSprinkles({
        size,
        fontWeight,
        textTransform,
        ...textProps,
      }),
      className
    );
  }, [className, fontWeight, size, textProps, textTransform]);
  return React.createElement(
    as,
    {
      ...textProps,
      className: generatedClassName,
      ref,
    },
    children
  );
});
