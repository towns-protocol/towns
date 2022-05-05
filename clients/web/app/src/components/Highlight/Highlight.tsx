import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "ui/components/Card/Card";
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

type Props = {
  userId: string;
  children?: React.ReactNode;
  type?: "background";
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  imageSrc: string;
  space: string;
  channel: string;
} & BoxProps;

export const Highlight = ({
  children,
  type,
  imageSrc,
  space,
  channel,
  colSpan = 3,
  userId,
  ...boxProps
}: Props) => (
  <Card
    colSpan={{ mobile: 12, desktop: colSpan }}
    background={{ lightMode: "default", darkMode: "level2" }}
    aspectRatio={type === "background" ? "2/1" : undefined}
    {...boxProps}
  >
    {type === "background" ? (
      <Stack grow>
        {imageSrc && <BackgroundImage src={imageSrc} gradient="dark" />}
        <Box absoluteFill padding>
          <Box grow>
            <Avatar
              border
              circle
              size="avatar_md"
              src={fakeUserCache[userId].avatarSrc}
            />
          </Box>
          <Box gap="paragraph" color="onTone">
            <NavLink to="/spaces/bored-ape-yacht-club/announcements">
              <Heading level={5}>
                {space} {channel && `#${channel}`}
              </Heading>
            </NavLink>
            <>{children}</>
          </Box>
        </Box>
      </Stack>
    ) : (
      <>
        <Box aspectRatio="2/1">
          {imageSrc && <BackgroundImage src={imageSrc} />}
        </Box>
        <Stack grow gap="md" paddingY="sm" paddingX="sm">
          {space && (
            <Heading level={6} color="gray2">
              {space} {channel && `#${channel}`}
            </Heading>
          )}
          <Stack grow gap="line">
            {children}
          </Stack>
          <Stack direction="row" gap="sm" alignItems="center">
            <Avatar
              circle
              size="avatar_xs"
              src={fakeUserCache[userId].avatarSrc}
            />
            <Paragraph color="gray1">
              {fakeUserCache[userId].displayName}
            </Paragraph>
          </Stack>
        </Stack>
      </>
    )}
  </Card>
);
