import React from "react";
import { Link } from "react-router-dom";
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
    >
      <Link to="/">
        <Heading level={3} color="accent">
          Harmony
        </Heading>
      </Link>
      <Box grow />
      <SearchInput />
      <Icon size="md" type="bell" background="level2" />
      <Avatar nft size="md" src="/ape.webp" onClick={props.onClick} />
    </Box>
  );
};
