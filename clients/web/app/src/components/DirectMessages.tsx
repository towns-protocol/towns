import { Box, Text } from "@ui";
import React from "react";
import { Avatar } from "ui/components/Avatar/Avatar";
import { ListRow } from "./ListRow";

export const DirectMessages = () => (
  <Box paddingTop="xs">
    <User src="/doodles.jpeg" selected>
      iamblue
    </User>
    <User active src="/ape.webp">
      yougster
    </User>
    <User src="/ape.webp">vas_sport</User>
    <User src="/ape.webp">gabiplaya</User>
    <User active src="/ape.webp">
      fliggyfrog
    </User>
    <User src="/ape.webp">dreambaby</User>
    <User src="/ape.webp">iamblue</User>
  </Box>
);

const User = (props: {
  children?: React.ReactText;
  active?: boolean;
  selected?: boolean;
  src?: string;
}) => (
  <ListRow
    paddingY="none"
    background={props.selected ? "accent" : undefined}
    minHeight="md"
  >
    <Avatar nft={true} src={props.src} />
    <Text
      fontWeight={!props.active && !props.selected ? "normal" : "strong"}
      color={props.selected ? "inverted" : !props.active ? "muted2" : "default"}
    >
      {props.children}
    </Text>
  </ListRow>
);
