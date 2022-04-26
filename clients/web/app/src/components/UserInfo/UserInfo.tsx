import React from "react";
import { AvatarStack } from "ui/components/AvatarStack";
import { Avatar, Heading, Icon, Paragraph, Stack } from "@ui";
import { fakeUserCache } from "data/UserData";

type Props = {
  userId: string;
};

export const UserInfo = ({ userId }: Props) => {
  const { spaceIds, avatarSrc, ...userData } = fakeUserCache[userId];
  const { displayName } = userData;
  const numSpaces = spaceIds?.length ?? 0;

  return (
    <Stack gap="sm">
      <Avatar nft src={avatarSrc} size="xl" />
      <Heading level={1}>{displayName}</Heading>
      <Stack horizontal alignItems="center" gap="xs">
        <Paragraph size="lg" fontWeight="strong">
          {userData.tokens}
        </Paragraph>
        <Icon type="token" />
        {numSpaces && (
          <Paragraph size="lg" color="gray2">
            &#8226; {numSpaces} {numSpaces > 1 ? "Spaces" : "Space"} in common
          </Paragraph>
        )}
        <AvatarStack userIds={["1", "2", "3", "9", "10"]} />
      </Stack>
    </Stack>
  );
};
