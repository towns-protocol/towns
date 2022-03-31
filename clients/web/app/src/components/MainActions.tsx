import { Paragraph } from "@ui";
import React from "react";
import { Icon } from "ui/components/Icons";
import { ListRow } from "./ListRow";

export const MainActions = () => (
  <>
    <ListRow>
      <Icon type="home" background="level3" size="sm" />
      <Paragraph>Home</Paragraph>
    </ListRow>
    <ListRow background="accent" color="inverted">
      <Icon type="message" size="sm" background="overlay" />
      <Paragraph>Messages</Paragraph>
    </ListRow>
    <ListRow>
      <Icon type="plus" background="level3" size="sm" />
      <Paragraph>New Space</Paragraph>
    </ListRow>
  </>
);
