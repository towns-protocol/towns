import React from "react";
import { SearchInput } from "@components/SearchInput";
import { Avatar, Box, Heading, Icon } from "@ui";

export const TopBar = (props: { onClick?: () => void }) => {
  return (
    <Box
      borderBottom
      direction="row"
      shrink={false}
      height="lg"
      paddingX="sm"
      background="level1"
      alignItems="center"
      gap="sm"
      onClick={props.onClick}
    >
      <Heading level={3} color="accent">
        Harmony
      </Heading>
      <Box grow />
      <SearchInput />
      <Icon size="md" type="bell" background="level2" />
      <Avatar nft size="md" src="ape.webp" />
    </Box>
  );
};
