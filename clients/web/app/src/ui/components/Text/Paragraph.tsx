import React, { forwardRef } from "react";
import { BoxProps } from "@ui";
import { Text } from "./Text";
import { TextSprinkles } from "./Text.css";

type ParagraphProps = {
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5";
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  display?: BoxProps["display"];
} & Omit<TextSprinkles, "size" | "fontSize">;

export const Paragraph = forwardRef<HTMLElement, ParagraphProps>(
  (props, ref) => {
    return <Text as="p" size="md" {...props} ref={ref} />;
  }
);
