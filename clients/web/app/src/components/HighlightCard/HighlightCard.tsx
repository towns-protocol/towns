import { BackgroundImage } from "@components/BackgroundImage";
import { Card } from "@components/Card/Card";
import { Avatar, Box, BoxProps, Paragraph } from "@ui";
import React from "react";

type Props = {
  colSpan?: 1 | 2 | 3 | 4;
} & BoxProps;

export const HighlightCard = ({ colSpan: span = 1, ...boxProps }: Props) => (
  <Card colSpan={span} aspectRatio="16/9" {...boxProps}>
    <BackgroundImage src="placeholders/frame_1.png" gradient="dark" />
    <Box absoluteFill padding>
      <Box grow>
        <Avatar size="md" borderRadius="full" shape="circle" border />
      </Box>
      <Box gap="xxs">
        <Paragraph color="inverted" size="sm">
          RTFKT #announcements
        </Paragraph>
        <Paragraph color="inverted" fontWeight="strong">
          Hey @everyone, Quest #3 Completed :⚔️ MNLTH has EVOLVED AND WHATTTTTT
          ? 1 Quest left ❌❌❌🗿Final ...
        </Paragraph>
      </Box>
    </Box>
  </Card>
);
