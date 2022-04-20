import React from "react";
import { NavLink } from "react-router-dom";
import { BackgroundImage } from "@components/BackgroundImage";
import { Card } from "@components/Card/Card";
import { Avatar, Box, BoxProps, Paragraph } from "@ui";

type Props = {
  colSpan?: 1 | 2 | 3 | 4;
} & BoxProps;

export const HighlightCard = ({ colSpan: span = 1, ...boxProps }: Props) => (
  <Card colSpan={span} aspectRatio="16/9" {...boxProps}>
    <BackgroundImage src="placeholders/frame_1.png" gradient="dark" />

    <Box absoluteFill padding>
      <Box grow>
        <Avatar border circle size="md" />
      </Box>
      <Box gap="xs">
        <NavLink to="/spaces/bored-ape-yacht-club/announcements">
          <Paragraph color="onTone" size="sm">
            RTFKT #announcements
          </Paragraph>
        </NavLink>
        <Paragraph color="onTone" fontWeight="strong">
          Hey @everyone, Quest #3 Completed :⚔️ MNLTH has EVOLVED AND WHATTTTTT
          ? 1 Quest left ❌❌❌🗿Final ...
        </Paragraph>
      </Box>
    </Box>
  </Card>
);
