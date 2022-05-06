import clsx from "clsx";
import React, { forwardRef } from "react";
import { BoxProps } from "@ui";
import * as style from "./ButtonText.css";
import { Text } from "./Text";
import { TextSprinkles } from "./Text.css";

export type ButtonTextProps = {
  as?: "p" | "span" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5";
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  truncate?: boolean;
  strong?: boolean;
} & Omit<TextSprinkles, "size" | "fontSize"> &
  Pick<BoxProps, "grow" | "shrink" | "display">;

export const ButtonText = forwardRef<HTMLElement, ButtonTextProps>(
  (props, ref) => {
    const { truncate = true, className, ...textProps } = props;
    return (
      <Text
        as="span"
        size="md"
        truncate={truncate}
        {...textProps}
        ref={ref}
        className={clsx([style.base, className])}
      />
    );
  }
);
