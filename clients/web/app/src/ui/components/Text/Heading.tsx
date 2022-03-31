import React, { forwardRef } from "react";
import { Text, TextProps } from "./Text";

enum HeadingNames {
  h1 = "h1",
  h2 = "h2",
  h3 = "h3",
  h4 = "h4",
  h5 = "h5",
}

const HeadingLevel = {
  1: { el: HeadingNames.h1, size: "xl32" as const },
  2: { el: HeadingNames.h2, size: "xl24" as const },
  3: { el: HeadingNames.h3, size: "xl" as const },
  // not sure if heading is appropriate below xl rather <P strong />
  4: { el: HeadingNames.h4, size: "lg" as const },
  5: { el: HeadingNames.h5, size: "md" as const },
  6: { el: HeadingNames.h5, size: "sm" as const },
} as const;

type HeadingProps = {
  /**
   * Custom classname appended to generated one
   */
  className?: string;
  children?: React.ReactNode;
  /**
   * Heading level, ordered from most important and down, equivalent to H1, H2, etc.
   */
  level?: keyof typeof HeadingLevel;
} & Omit<TextProps, "size" | "fontSize" | "fontWeight">;

export const Heading = forwardRef<HTMLElement, HeadingProps>((props, ref) => {
  const { level = 1, ...textProps } = props;
  const { el, size } = HeadingLevel[level];
  return (
    <Text as={el} size={size} fontWeight="strong" ref={ref} {...textProps} />
  );
});
