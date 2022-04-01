import { Box, BoxProps } from "@ui";
import React from "react";
import {
  backgroundImageClassName,
  backgroundImageContainerClassName,
  BackgroundImageContainerVariantProps,
  BackgroundImageVariantProps,
} from "./BackgorundImage.css";

type Props = {
  src: string;
  alt?: string;
} & BoxProps &
  BackgroundImageVariantProps &
  BackgroundImageContainerVariantProps;

export const BackgroundImage = ({
  src,
  alt,
  size = "cover",
  gradient,
  ...props
}: Props) => {
  return (
    <Box
      position="relative"
      grow
      className={backgroundImageContainerClassName({ gradient })}
      {...props}
    >
      <img className={backgroundImageClassName({ size })} src={src} alt={alt} />
    </Box>
  );
};
