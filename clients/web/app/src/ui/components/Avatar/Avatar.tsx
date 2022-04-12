import clsx from "clsx";
import React from "react";
import { Box, BoxProps } from "../Box/Box";
import {
  AvatarAtoms,
  avatarAtoms,
  avatarBaseStyle,
  avatarToggleClasses,
} from "./Avatar.css";

type Props = {
  src?: string;
  onClick?: BoxProps["onClick"];
  insetX?: BoxProps["insetX"];
  insetY?: BoxProps["insetY"];
  inset?: BoxProps["inset"];
} & AvatarAtoms;

export const Avatar = (props: Props) => {
  const {
    size = "md",
    height = "md",
    nft = false,
    circle = false,
    stacked = false,

    border,
    src = "/placeholders/nft_5.png",
    ...boxProps
  } = props;
  return (
    <Box
      shrink={false}
      className={clsx(
        avatarToggleClasses({ nft, stacked, border, circle }),
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
};
