import { Box } from "@ui";
import React, { forwardRef } from "react";
import { TextSprinkles } from "./Text.css";

type Props = {
  // HTML representation
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5";
  // HTML class name
  className?: string;
  // React child nodes
  children?: React.ReactNode;
  // Size token
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xl24" | "xl32";
} & TextSprinkles;

export type TextProps = Props;

export const Text = forwardRef<HTMLElement, Props>((props: Props, ref) => {
  const {
    as = "p",
    size = "md",
    fontWeight = "normal",
    textTransform = "none",
    textAlign = "left",
    children,
    className,
    ...boxProps
  } = props;

  const textProps = { fontSize: size, fontWeight, textTransform, textAlign };

  return (
    <Box as={as} {...textProps} {...boxProps} ref={ref}>
      {children}
    </Box>
  );
});
