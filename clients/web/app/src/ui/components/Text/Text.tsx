import React, { forwardRef } from "react";
import clsx from "clsx";
import { Box, BoxProps } from "@ui";
import { TextSprinkles, singleLineStyle } from "./Text.css";

type Props = {
  // HTML representation
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5";
  // HTML class name
  className?: string;
  // React child nodes
  children?: React.ReactNode;

  // Size token
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xl24" | "xl32";
  //
  singleLine?: boolean;

  display?: BoxProps["display"];
} & TextSprinkles;

export type TextProps = Props;

export const Text = forwardRef<HTMLElement, Props>((props: Props, ref) => {
  const {
    as = "p",
    size = "md",
    fontWeight = "normal",
    textTransform = "none",
    textAlign = "left",
    singleLine,
    children,
    className,
    ...boxProps
  } = props;

  const textProps = { fontSize: size, fontWeight, textTransform, textAlign };

  return (
    <Box
      as={as}
      className={clsx(className, singleLine && singleLineStyle)}
      {...textProps}
      {...boxProps}
      ref={ref}
    >
      {children}
    </Box>
  );
});
