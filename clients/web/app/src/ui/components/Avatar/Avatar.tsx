import clsx from "clsx";
import { motion } from "framer-motion";
import React, { forwardRef } from "react";
import { Box, BoxProps } from "../Box/Box";
import {
  AvatarAtoms,
  avatarAtoms,
  avatarBaseStyle,
  avatarToggleClasses,
} from "./Avatar.css";

type Props = {
  src?: string;
  animate?: boolean;
  onClick?: BoxProps["onClick"];
  insetX?: BoxProps["insetX"];
  insetY?: BoxProps["insetY"];
  inset?: BoxProps["inset"];
} & AvatarAtoms;

export const Avatar = forwardRef<HTMLElement, Props>((props, ref) => {
  const {
    animate = false,
    size = "md",
    height = "md",
    circle = false,
    stacked = false,
    border,
    src = "/placeholders/nft_5.png",
    ...boxProps
  } = props;

  const Container = animate ? MotionBox : Box;

  return (
    <Container
      variants={{ initial: { scale: 1 }, hover: { scale: 1.1 } }}
      ref={ref}
      shrink={false}
      className={clsx(
        avatarToggleClasses({ stacked, border, circle }),
        avatarAtoms({
          size: size ?? height,
        }),
        avatarBaseStyle
      )}
      style={{
        backgroundImage: `url(${src})`,
      }}
      {...boxProps}
    />
  );
});

const MotionBox = motion(Box);
