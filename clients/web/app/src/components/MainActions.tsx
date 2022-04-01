import { Paragraph } from "@ui";
import React from "react";
import { Icon } from "ui/components/Icon";
import { NavItem } from "./NavItem/NavItem";

export const MainActions = () => (
  <>
    <NavItem>
      <Icon type="home" background="level3" size="sm" />
      <Paragraph>Home</Paragraph>
    </NavItem>
    <NavItem background="accent" color="inverted">
      <Icon type="message" size="sm" background="overlay" />
      <Paragraph>Messages</Paragraph>
    </NavItem>
    <NavItem>
      <Icon type="plus" background="level3" size="sm" />
      <Paragraph>New Space</Paragraph>
    </NavItem>
  </>
);
