import React from "react";
import { Box, BoxProps } from "../Box/Box";
import { AvatarStyle, avatarStyle } from "./Avatar.css";

type Props = {
  src?: string;
} & AvatarStyle &
  BoxProps;

export const Avatar = (props: Props) => {
  const { size = "md", nft = false, src = "ape.webp", ...boxProps } = props;
  return (
    <Box
      className={avatarStyle({ size, nft })}
      style={{
        backgroundImage: `url(${src})`,
      }}
      {...boxProps}
    />
  );
};
