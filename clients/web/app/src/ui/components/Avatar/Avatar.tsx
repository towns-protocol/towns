import { clsx } from "clsx";
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
  type?: "user" | "space";
  onClick?: BoxProps["onClick"];
  insetX?: BoxProps["insetX"];
  insetY?: BoxProps["insetY"];
  inset?: BoxProps["inset"];
  boxShadow?: BoxProps["boxShadow"];
} & Omit<AvatarAtoms, "circle">;

export type AvatarProps = Props;

export const Avatar = forwardRef<HTMLElement, Props>((props, ref) => {
  const {
    animate = false,
    size = "avatar_md",
    height = "avatar_md",
    type = "user",
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
        avatarToggleClasses({ stacked, border, circle: type === "user" }),
        undefined,
        avatarAtoms({
          size: size ?? height,
        }),
        avatarBaseStyle,
      )}
      style={{
        backgroundImage: `url(${src})`,
      }}
      {...boxProps}
    />
  );
});

const MotionBox = motion(Box);
