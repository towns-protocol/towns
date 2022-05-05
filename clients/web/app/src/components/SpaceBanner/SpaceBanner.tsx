import React, { useCallback } from "react";
import { Avatar, Box, Dropdown, Heading, Icon, Paragraph, Stack } from "@ui";
import { fakeUsers } from "data/UserData";

type Props = {
  bannerSrc?: string;
  avatarSrc?: string;
  name?: string;
};

const pseudos = [fakeUsers[0], fakeUsers[10], fakeUsers[20]];

export const SpaceBanner = (props: Props) => {
  const { avatarSrc, name } = props;
  return (
    <Stack grow width="100%" justifyContent="center">
      <Stack horizontal gap="md" padding="md">
        {/* avatar container */}
        <Box border padding="sm" borderRadius="lg" background="level1">
          <Avatar circle src={avatarSrc} size="avatar_xxl" />
        </Box>
        {/* title and stats container */}
        <Stack grow justifyContent="center" gap="md">
          <Heading level={3}>{name}</Heading>
          <SpaceSummary />
        </Stack>
        {/* actions container */}
        <Stack alignItems="center" direction="row" gap="sm">
          <UserDropDown />
          <Icon
            type="settings"
            background="level2"
            size="square_lg"
            padding="sm"
          />
        </Stack>
      </Stack>
    </Stack>
  );
};

export const SpaceSummary = ({ compact }: { compact?: boolean }) => (
  <Stack horizontal gap={compact ? "sm" : "md"} color="gray1">
    <Stack horizontal gap={compact ? "xs" : "sm"} alignItems="center">
      <Box background="accent" square="square_sm" rounded="full" />
      <Paragraph size={compact ? "sm" : "lg"}>2.3K</Paragraph>
    </Stack>
    <Stack horizontal gap={compact ? "xs" : "sm"} alignItems="center">
      <Icon type="token" size="square_xs" />
      <Paragraph size={compact ? "sm" : "lg"}>12.4M</Paragraph>
    </Stack>
  </Stack>
);

const UserDropDown = () => {
  const renderSelected = useCallback((selected?: string) => {
    const user = fakeUsers.find((u) => selected === u.id);
    return !user ? (
      <></>
    ) : (
      <>
        {user.displayName}
        <Avatar circle src={user.avatarSrc} size="avatar_xs" />
        <Icon type="down" size="square_inline" />
      </>
    );
  }, []);

  return (
    <Dropdown
      items={pseudos}
      renderSelected={renderSelected}
      selected={pseudos[0].id}
    />
  );
};
