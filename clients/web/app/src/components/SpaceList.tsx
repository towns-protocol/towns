import { Text } from "@ui";
import React from "react";
import { Avatar } from "ui/components/Avatar/Avatar";
import { ListRow } from "./ListRow";

export const SpaceList = () => (
  <>
    {Array(10)
      .fill(null)
      .map((_i, k) => (
        <ListRow key={k}>
          <Avatar imgSrc={"/punk.webp"} />
          <Text>New message</Text>
        </ListRow>
      ))}
  </>
);
