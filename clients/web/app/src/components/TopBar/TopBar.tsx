import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "@components/Logo/Logo";
import { Search } from "@components/Search";
import { Avatar, Box, Icon, Stack } from "@ui";

export const TopBar = (props: { onClick?: () => void }) => {
  return (
    <Stack
      borderBottom
      direction="row"
      shrink={false}
      height="height_xl"
      paddingX="md"
      background="level1"
      alignItems="center"
      gap="md"
      color="gray2"
      position="sticky"
      style={{ top: 0, zIndex: 10 }}
    >
      <Box color="default">
        <Link to="/">
          <Logo />
        </Link>
      </Box>
      <Box grow />
      <Search />
      <Icon size="square_lg" type="bell" background="level1" />
      <Avatar
        circle
        size="avatar_lg"
        src="/placeholders/nft_1.png"
        onClick={props.onClick}
      />
    </Stack>
  );
};
