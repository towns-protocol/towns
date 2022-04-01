import { SearchInput } from "@components/SearchInput";
import { Avatar, Box, Heading } from "@ui";
import React from "react";
import { Icon } from "ui/components/Icon";

export const TopBar = () => {
  return (
    <Box
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
