import React, { useContext } from "react";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Reactions } from "@components/Reactions";
import { Replies } from "@components/Replies";
import { Avatar, Box, Grid, Paragraph, Stack } from "@ui";
import { SizeContext } from "ui/hooks/useSizeContext";

export const HighlightsGrid = () => {
  return (
    <Grid columns={12} gap="md">
      <Placeholder />
    </Grid>
  );
};

const Placeholder = () => {
  const sizeContext = useContext(SizeContext);
  const size = sizeContext?.size.width ?? 1000;
  const colSpan = size > 1400 ? 3 : size > 1100 ? 4 : size > 600 ? 6 : 12;
  return !size ? null : (
    <Box
      padding
      border
      rounded="md"
      background="level2"
      colSpan={colSpan}
      gap="md"
    >
      <Stack gap="md" maxWidth="500" justifyContent="center">
        <Avatar circle size="avatar_x6" />
        <Paragraph color="gray2">benrb.eth</Paragraph>
        <Paragraph color="default">
          Welcome council members! We’re excited to show you Zion and get your
          thoughts on what to work on next. Can’t wait to learn more about your.
          Introduce yourself here in this thread!
        </Paragraph>
        <Paragraph color="gray2" size="sm">
          Today at 11:01AM
        </Paragraph>
        <Stack horizontal>
          <Replies replies={{ userIds: [1, 2, 3], fakeLength: 23 }} />
        </Stack>
        <Reactions reactions={{ "📐": size, "💯": colSpan }} />
        <MessageInput />
      </Stack>
    </Box>
  );
};
