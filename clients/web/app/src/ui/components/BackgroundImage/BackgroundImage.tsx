import React from "react";
import { Box, BoxProps } from "@ui";
import {
  BackgroundContainerStyle,
  BackgroundVariantProps,
} from "./BackgroundImage.css";

type Props = {
  src?: string;
  alt?: string;
  size?: "cover" | "contain";
} & BoxProps &
  BackgroundVariantProps;

export const BackgroundImage = ({
  src,
  alt,
  size = "cover",
  gradient,
  overlay,
  ...props
}: Props) => {
  return (
    <Box
      grow
      position="relative"
      className={BackgroundContainerStyle({ gradient, overlay, size })}
      style={{ backgroundImage: `url(${src})` }}
      {...props}
    />
  );
};
