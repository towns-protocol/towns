import clsx from "clsx";
import React from "react";
import { Box } from "../Box/Box";
import {
  AvatarAtoms,
  avatarAtoms,
  avatarBaseStyle,
  avatarToggleClasses,
} from "./Avatar.css";

type Props = {
  src?: string;
} & AvatarAtoms;

export const Avatar = (props: Props) => {
  const {
    size = "md",
    height = "md",
    nft = false,
    circle = false,
    stacked = false,
    border,
    src = "ape.webp",
    ...boxProps
  } = props;
  return (
    <Box
      className={clsx(
        avatarToggleClasses({ nft, stacked, border, circle }),
        avatarAtoms({
          size,
          height,
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
