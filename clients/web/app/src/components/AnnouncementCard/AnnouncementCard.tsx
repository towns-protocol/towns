import React from "react";
import { BackgroundImage } from "@components/BackgroundImage";
import { Card } from "@components/Card/Card";
import { Avatar, Box, BoxProps, Paragraph, Stack } from "@ui";

type Props = {
  colSpan?: 1 | 2 | 3 | 4;
} & BoxProps;

export const AnnouncementCard = ({ colSpan = 1, ...boxProps }: Props) => (
  <Card colSpan={colSpan} {...boxProps}>
    <Box grow border aspectRatio="16/9">
      <BackgroundImage src="placeholders/frame_1.png" gradient="dark" />
    </Box>
    <Stack grow gap="xs" background="default" padding="xs">
      <Paragraph color="gray2" fontWeight="strong">
        Azuki #announcement
      </Paragraph>
      <Stack gap="xs" color="gray1">
        <Paragraph>Oh shit we’re in Forbes!!</Paragraph>
        <Paragraph truncate>
          https://www.forbes.com/sites/jeffkauflin/2022/02/14/how-azukis-suddenly-became-the-worlds...
        </Paragraph>
        <Paragraph>
          More content in the article above. Text on several lines...
        </Paragraph>
      </Stack>
      <Stack direction="row" gap="xs" alignItems="center">
        <Avatar circle size="xs" />
        <Paragraph color="gray1">meocat</Paragraph>
      </Stack>
    </Stack>
  </Card>
);
