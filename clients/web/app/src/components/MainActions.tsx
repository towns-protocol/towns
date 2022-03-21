import { Box, Text } from "@ui";
import React from "react";
import {
  IconContainer,
  MessageIcon,
  PlusIcon,
  SearchIcon,
} from "ui/components/Icons";
import { ListRow } from "./ListRow";

export const MainActions = () => (
  <Box borderBottom="thin" color="muted2">
    <ListRow>
      <IconContainer icon={SearchIcon} />
      <Text>Search</Text>
    </ListRow>
    <ListRow background="accent" color="inverted">
      <IconContainer icon={MessageIcon} />
      <Text>Direct Messages</Text>
    </ListRow>
    <ListRow>
      <IconContainer icon={PlusIcon} />
      <Text>New message</Text>
    </ListRow>
  </Box>
);
