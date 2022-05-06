import React from "react";
import {
  Avatar,
  BackgroundImage,
  Box,
  BoxProps,
  Heading,
  Paragraph,
  Stack,
} from "@ui";
import { fakeUserCache } from "data/UserData";
import { Card } from "ui/components/Card/Card";

type Props = {
  userId: string;
  children?: React.ReactNode;
  type?: "background";
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  imageSrc: string;
  space: string;
  channel: string;
} & BoxProps;

export const ShareCard = ({
  children,
  type,
  imageSrc,
  space,
  channel,
  colSpan = 4,
  userId,
  ...boxProps
}: Props) => (
  <Card
    colSpan={{ tablet: 6, desktop: colSpan }}
    background={{ lightMode: "default", darkMode: "level2" }}
    padding="sm"
    {...boxProps}
  >
    <>
      <Stack>
        <Stack horizontal paddingY="sm" gap="sm">
          <Box
            shrink={false}
            square="square_xxl"
            rounded="md"
            overflow="hidden"
          >
            {imageSrc && <BackgroundImage src={imageSrc} />}
          </Box>
          <Stack horizontal grow>
            <Stack gap="paragraph">
              {space && (
                <Heading level={6} color="gray2">
                  {space} {channel && `#${channel}`}
                </Heading>
              )}
              {children}
            </Stack>
          </Stack>
        </Stack>
        <Stack borderTop paddingTop="sm" paddingBottom="none">
          <Stack
            horizontal
            centerContent
            gap="sm"
            alignItems="center"
            color="gray2"
            fontSize="sm"
          >
            <Paragraph size="sm">Shared by</Paragraph>
            <Avatar
              circle
              size="avatar_xs"
              src={fakeUserCache[userId].avatarSrc}
            />
            <Paragraph size="sm">{fakeUserCache[userId].displayName}</Paragraph>
          </Stack>
        </Stack>
      </Stack>
    </>
  </Card>
);
