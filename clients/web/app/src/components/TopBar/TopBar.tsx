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
      height="x7"
      paddingX="sm"
      background="level1"
      alignItems="center"
      gap="sm"
      color="gray2"
    >
      <Box color="default">
        <Link to="/">
          <Logo />
        </Link>
      </Box>
      <Box grow />
      <Search />
      <Icon size="lg" type="bell" background="level1" />
      <Avatar
        circle
        size="lg"
        src="/placeholders/nft_1.png"
        onClick={props.onClick}
      />
    </Stack>
  );
};
