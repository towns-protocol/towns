import React, { useContext, useMemo } from "react";
import { useSpaceId } from "use-zion-client";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Reactions } from "@components/Reactions";
import { Replies } from "@components/Replies";
import { Avatar, BackgroundImage, Box, Grid, Paragraph, Stack } from "@ui";
import { Message, fakeMessages } from "data/HighlightsData";
import { fakeUserCache } from "data/UserData";
import { SizeContext } from "ui/hooks/useSizeContext";

const colSpanMap = {
  4: 3,
  3: 4,
  2: 6,
  1: 12,
} as const;

export const Highlights = () => {
  const spaceId = useSpaceId();

  const sizeContext = useContext(SizeContext);
  const size = sizeContext?.size.width ?? 0;
  const col = size > 1400 ? 4 : size > 1100 ? 3 : size > 600 ? 2 : 1;
  const messages = useMemo(
    () => fakeMessages(spaceId?.slug ?? ""),
    [spaceId?.slug],
  );
  const columns = useColumns(messages, col);

  if (!size) {
    return null;
  }

  const colSpan = colSpanMap[col];

  const isMainSpace = !spaceId;

  return (
    <Grid columns={12}>
      {columns.map(
        (c) =>
          c.messages.length && (
            <Stack colSpan={colSpan} gap="md" key={c.id}>
              {c.messages.map((m, index) => (
                <Placeholder
                  message={m}
                  key={m.id}
                  index={index}
                  mainSpace={isMainSpace}
                />
              ))}
            </Stack>
          ),
      )}
    </Grid>
  );
};

const useColumns = (messages: Message[], col: number) => {
  return useMemo(() => {
    const initialColumns = Array(col)
      .fill(0)
      .map((_, i) => ({ id: `col-${i}`, messages: [] }));

    return messages.reduce(
      (columns: { id: string; messages: Message[] }[], m, i) => {
        const columnIndex = i % col;
        const column: Message[] = columns[columnIndex].messages;
        column.push(m);
        return columns;
      },
      initialColumns,
    );
  }, [col, messages]);
};

type PlaceholderProps = {
  index: number;
  message: Message;
  mainSpace: boolean;
};

const Placeholder = (props: PlaceholderProps) => {
  const { message, mainSpace: isMainSpace } = props;

  const user = fakeUserCache[message.userId];

  return (
    <Box
      border
      shrink
      rounded="md"
      background={isMainSpace ? "default" : "level2"}
      overflow="hidden"
    >
      <Stack justifyContent="center">
        {message.imageUrl && (
          <Box grow position="relative" height="200">
            <BackgroundImage
              padding
              src={message.imageUrl}
              justifyContent="end"
            >
              <Avatar
                size="avatar_md"
                src={user.avatarSrc}
                boxShadow="avatar"
              />
            </BackgroundImage>
          </Box>
        )}

        <Stack padding gap="md">
          {!message.imageUrl && (
            <Avatar size="avatar_md" src={user.avatarSrc} />
          )}
          <Paragraph color="gray2">{user.displayName}</Paragraph>
          <Paragraph color="gray1">{message.body}</Paragraph>
          <Paragraph color="gray2" size="sm">
            Today at 11:01AM
          </Paragraph>
          {message.link && (
            <Stack
              border
              paddingY="paragraph"
              paddingX="sm"
              background="level3"
              rounded="sm"
              gap="sm"
            >
              <Paragraph>{message.link.title}</Paragraph>
              <Paragraph truncate size="sm" color="gray2">
                {message.link.href}
              </Paragraph>
            </Stack>
          )}
          {message.replies && (
            <Stack horizontal>
              <Replies replies={message.replies} />
            </Stack>
          )}
          {message.reactions && <Reactions reactions={message.reactions} />}
          <MessageInput size="input_md" />
        </Stack>
      </Stack>
    </Box>
  );
};
