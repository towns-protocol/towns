import { Box, Text, BoxProps } from "@ui";
import React, { forwardRef } from "react";
import { ListRow } from "./ListRow";

export const DirectMessages: React.FC = () => (
  <>
    <User />
    <User />
    <User />
    <User />
    <User />
    <User />
    <User />
  </>
);

const User = () => (
  <ListRow>
    <Box
      square="sm"
      aspectRatio="square"
      borderRadius="full"
      style={{
        backgroundImage: `url(ape.webp)`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    />
    <Text>iamblue</Text>
  </ListRow>
);
