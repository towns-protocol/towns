import { Text } from "@ui";
import React from "react";
import { Avatar } from "ui/components/Avatar/Avatar";
import { ListRow } from "./ListRow";

export const SpaceList = () => (
  <>
    <Space />
    <Space />
    <Space active />
    <Space />
    <Space active />
    <Space />
    <Space />
  </>
);

const Space = (props: { active?: boolean }) => (
  <ListRow height="lg">
    <Avatar src={"punk.webp"} />
    <Text
      color={props.active ? "default" : "muted2"}
      fontWeight={props.active ? "strong" : "normal"}
    >
      Outer Space
    </Text>
  </ListRow>
);
