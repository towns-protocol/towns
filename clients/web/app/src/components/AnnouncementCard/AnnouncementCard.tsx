import { Card } from "@components/Card/Card";
import { BackgroundImage } from "@components/BackgroundImage";
import { Avatar, Box, BoxProps, Paragraph } from "@ui";
import React from "react";

type Props = {
  colSpan?: 1 | 2 | 3 | 4;
} & BoxProps;

export const AnnouncementCard = ({ colSpan = 1, ...boxProps }: Props) => (
  <Card colSpan={colSpan} {...boxProps}>
    <Box grow border aspectRatio="4/3">
      <BackgroundImage src="placeholders/frame_2.png" gradient="dark" />
    </Box>
    <Box grow gap="sm" background="default" padding="xs">
      <Paragraph color="muted1" fontWeight="strong">
        Azuki #announcement
      </Paragraph>
      <Paragraph color="muted">
        Oh shit we’re in Forbes!!
        https://www.forbes.com/sites/jeffkauflin/2022/02/14/how-azukis-suddenly-became-the-worlds...
      </Paragraph>
      <Box direction="row" gap="xs" alignItems="center">
        <Avatar size="sm" shape="circle" />
        <Paragraph color="muted">meocat</Paragraph>
      </Box>
    </Box>
  </Card>
);
