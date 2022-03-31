import { Text } from "@ui";
import React from "react";
import { Avatar } from "ui/components/Avatar/Avatar";
import { ListRow } from "./ListRow";

export const SpaceList = () => (
  <>
    <Space selected />
    <Space />
    <Space active />
    <Space />
    <Space active />
    <Space />
    <Space />
  </>
);

const Space = ({
  active,
  selected,
}: {
  active?: boolean;
  selected?: boolean;
}) => (
  <ListRow
    paddingX="sm"
    height="md"
    background={selected ? "accent" : undefined}
  >
    <Avatar src={"punk.webp"} size="md" />
    <Text
      color={selected ? "inverted" : active ? "default" : "muted2"}
      fontWeight={active ? "strong" : "normal"}
    >
      Outer Space
    </Text>
  </ListRow>
);
