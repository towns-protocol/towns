import React from "react";
import { Box, BoxProps } from "@ui";
import {
  BackgroundImageContainerVariantProps,
  BackgroundImageVariantProps,
  backgroundImageClassName,
  backgroundImageContainerClassName,
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
      grow
      position="relative"
      className={backgroundImageContainerClassName({ gradient })}
      {...props}
    >
      <img className={backgroundImageClassName({ size })} src={src} alt={alt} />
    </Box>
  );
};
