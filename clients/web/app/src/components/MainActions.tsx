import { Box, Text } from "@ui";
import React from "react";
import { Icon } from "ui/components/Icons";
import { ListRow } from "./ListRow";

export const MainActions = () => (
  <Box borderBottom color="muted2">
    <ListRow>
      <Icon type="home" size="sm" />
      <Text>Home</Text>
    </ListRow>
    <ListRow background="accent" color="inverted">
      <Icon type="message" size="sm" background="overlay" />
      <Text>Messages</Text>
    </ListRow>
    <ListRow>
      <Icon type="plus" size="sm" background="level3" />
      <Text>New Space</Text>
    </ListRow>
  </Box>
);
