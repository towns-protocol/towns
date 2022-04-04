import { SearchInput } from "@components/SearchInput";
import { Avatar, Box, Heading, Icon } from "@ui";
import React from "react";

export const TopBar = (props: { onClick?: () => void }) => {
  return (
    <Box
      onClick={props.onClick}
      direction="row"
      shrink={false}
      height="lg"
      paddingX="sm"
      background="level1"
      borderBottom
      alignItems="center"
      gap="sm"
    >
      <Heading level={3} color="accent">
        Harmony
      </Heading>
      <Box grow />
      <SearchInput />
      <Icon size="md" type="bell" background="level2" />
      <Avatar size="md" nft src="ape.webp" />
    </Box>
  );
};
