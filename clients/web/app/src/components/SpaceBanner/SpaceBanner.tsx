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
      <Stack horizontal gap="sm" padding="sm">
        {/* avatar container */}
        <Box border padding="xs" borderRadius="lg" background="level1">
          <Avatar circle src={avatarSrc} size="xxl" />
        </Box>
        {/* title and stats container */}
        <Stack grow justifyContent="center" gap="sm">
          <Heading level={3}>{name}</Heading>
          <Stack horizontal gap="sm" color="gray1">
            <Stack horizontal gap="xs" alignItems="center">
              <Box background="accent" square="xxs" rounded="full" />
              <Paragraph size="lg">2.3K</Paragraph>
            </Stack>
            <Stack horizontal gap="xs" alignItems="center">
              <Icon type="token" size="xs" />
              <Paragraph size="lg">12.4M</Paragraph>
            </Stack>
          </Stack>
        </Stack>
        {/* actions container */}
        <Stack alignItems="center" direction="row" gap="xs">
          <UserDropDown />
          <Icon type="settings" background="level2" size="lg" padding="xs" />
        </Stack>
      </Stack>
    </Stack>
  );
};

const UserDropDown = () => {
  const renderSelected = useCallback((selected?: string) => {
    const user = fakeUsers.find((u) => selected === u.id);
    return !user ? (
      <></>
    ) : (
      <>
        {user.displayName}
        <Avatar circle nft src={user.avatarSrc} size="xs" />
        <Icon type="down" size="adapt" />
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
