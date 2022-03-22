import React from "react";
import { AvatarStyle, avatarStyle } from "./Avatar.css";

type Props = {
  src?: string;
} & AvatarStyle;

export const Avatar = (props: Props) => {
  const { size = "sm", nft = false } = props;
  return (
    <div
      className={avatarStyle({ size, nft })}
      style={{
        backgroundImage: `url(${props.src})`,
      }}
    />
  );
};
