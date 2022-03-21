import clsx from "clsx";
import React, { forwardRef, useMemo } from "react";
import { textSprinkles, TextSprinkles } from "./Text.css";

type Props = {
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5";
  className?: string;
  children?: React.ReactNode;
  size?: "xxs" | "xs" | "sm" | "md" | "lg";
} & TextSprinkles;

export const Text = forwardRef<HTMLElement, Props>((props: Props, ref) => {
  const { as = "p", children, className, ...textProps } = props;
  const generatedClassName = useMemo(() => {
    return clsx(
      textSprinkles({
        ...textProps,
      }),
      className
    );
  }, [className, textProps]);
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
