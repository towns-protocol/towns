import React from "react";
import { Avatar, Box } from "@ui";
import { avatarSizes } from "ui/styles/atoms/properties/avatarProperties.css";

type Props = {
  userIds: string[];
  size?: keyof typeof avatarSizes;
};

export const AvatarStack = (props: Props) => {
  const { size = "md", userIds } = props;
  return (
    <Box direction="row">
      {userIds.map((id) => (
        <Avatar
          stacked
          circle
          key={id}
          src={`/placeholders/nft_${id}.png`}
          size={size}
        />
      ))}
    </Box>
  );
};
