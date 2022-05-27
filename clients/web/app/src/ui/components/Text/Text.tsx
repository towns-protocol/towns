import clsx from "clsx";
import React, { forwardRef } from "react";
import { Box, BoxProps } from "@ui";
import {
  TextSprinkles,
  fontStyles,
  truncateParentStyle,
  truncateTextStyle,
} from "./Text.css";

type ParagraphProps = {
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5" | "label";
};

type LabelProps = {
  as: "label";
  for: string;
};

type Props = (ParagraphProps | LabelProps) & {
  // HTML class name
  className?: string;
  // React child nodes
  children?: React.ReactNode;

  // Size token
  size?: "sm" | "md" | "lg" | "xl" | "xl24" | "xl32";

  truncate?: boolean;

  strong?: boolean;

  display?: BoxProps["display"];
} & TextSprinkles;

export type TextProps = Props & Pick<BoxProps, "grow">;

export const Text = forwardRef<HTMLElement, TextProps>((props, ref) => {
  const {
    as = "span",
    size = "md",
    display = "block",
    strong = false,
    fontWeight,
    textTransform = "none",
    textAlign = "left",
    truncate,
    children,
    className,
    ...boxProps
  } = props;

  const textProps = {
    fontSize: size,
    fontWeight: fontWeight ?? (strong ? "strong" : "normal"),
    textTransform,
    textAlign,
  };

  return (
    <Box
      as={as}
      display={display}
      className={clsx(
        truncate && truncateParentStyle,
        fontStyles[0].className,
        className,
      )}
      {...textProps}
      {...boxProps}
      ref={ref}
    >
      {truncate ? <Truncate>{children}</Truncate> : children}
    </Box>
  );
});

const Truncate = (props: { children?: React.ReactNode }) => (
  <Box as="span" className={truncateTextStyle}>
    {props.children}
  </Box>
);
