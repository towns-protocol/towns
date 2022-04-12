import React, { forwardRef } from "react";
import { Box, BoxProps } from "@ui";
import {
  TextSprinkles,
  singleLineStyle,
  textBaseStyle,
  truncateParentStyle,
} from "./Text.css";

type Props = {
  // HTML representation
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5";
  // HTML class name
  className?: string;
  // React child nodes
  children?: React.ReactNode;

  // Size token
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xl24" | "xl32";

  truncate?: boolean;

  display?: BoxProps["display"];
} & TextSprinkles;

export type TextProps = Props & Pick<BoxProps, "grow">;

export const Text = forwardRef<HTMLElement, TextProps>((props, ref) => {
  const {
    as = "p",
    size = "md",
    display = "block",
    fontWeight = "normal",
    textTransform = "none",
    textAlign = "left",
    truncate,
    children,
    className,
    ...boxProps
  } = props;

  const textProps = { fontSize: size, fontWeight, textTransform, textAlign };

  return (
    <Box
      as={as}
      display={display}
      className={[
        truncate && truncateParentStyle,
        textBaseStyle,
        className,
      ].join(" ")}
      {...textProps}
      {...boxProps}
      ref={ref}
    >
      {truncate ? <Truncate>{children}</Truncate> : children}
    </Box>
  );
});

const Truncate = (props: { children?: React.ReactNode }) => (
  <Box as="span" className={singleLineStyle}>
    {props.children}
  </Box>
);
