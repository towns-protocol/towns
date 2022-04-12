import React from "react";
import { Card } from "@components/Card/Card";
import { BackgroundImage } from "@components/BackgroundImage";
import { Avatar, Box, BoxProps, Paragraph, Text } from "@ui";

type Props = {
  colSpan?: 1 | 2 | 3 | 4;
} & BoxProps;

export const AnnouncementCard = ({ colSpan = 1, ...boxProps }: Props) => (
  <Card colSpan={colSpan} {...boxProps}>
    <Box grow border aspectRatio="16/9">
      <BackgroundImage src="placeholders/frame_2.png" gradient="dark" />
    </Box>
    <Box grow gap="xs" background="default" padding="xs">
      <Paragraph color="gray2" fontWeight="strong">
        Azuki #announcement
      </Paragraph>
      <Paragraph color="gray1">
        Oh shit we’re in Forbes!!
        <Text truncate>
          https://www.forbes.com/sites/jeffkauflin/2022/02/14/how-azukis-suddenly-became-the-worlds...
        </Text>
        read more. read more.read more.read more.read more.read more.read
        more.read more.read more.
      </Paragraph>
      <Box direction="row" gap="xs" alignItems="center">
        <Avatar circle size="xs" />
        <Paragraph color="gray1">meocat</Paragraph>
      </Box>
    </Box>
  </Card>
);
