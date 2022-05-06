import React from "react";
import { Avatar, Stack } from "@ui";
import { avatarSizes } from "ui/styles/atoms/properties/avatarProperties.css";

type Props = {
  userIds: string[];
  size?: keyof typeof avatarSizes;
};

export const AvatarStack = (props: Props) => {
  const { size = "avatar_md", userIds } = props;
  return (
    <Stack horizontal>
      {userIds.map((id) => (
        <Avatar
          stacked
          key={id}
          src={`/placeholders/nft_${id}.png`}
          size={size}
        />
      ))}
    </Stack>
  );
};
