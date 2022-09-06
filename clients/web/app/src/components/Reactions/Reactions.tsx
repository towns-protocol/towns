import { EmojiData } from "emoji-mart";
import { get as getEmoji } from "node-emoji";
import React, { useCallback, useMemo } from "react";
import { EmojiPickerButton } from "@components/EmojiPickerButton";
import { Stack, Text } from "@ui";
import { MessageReactions } from "hooks/useFixMeMessageThread";

export const Reactions = (props: {
  reactions: MessageReactions;
  userId?: string | null;
  parentId?: string;
  onReaction?: (eventId: string, name: string) => void;
}) => {
  const { userId, parentId, reactions, onReaction } = props;

  const onReact = useCallback(
    (reaction: string) => {
      if (onReaction && parentId) {
        onReaction(parentId, reaction);
      }
    },
    [onReaction, parentId],
  );

  const onReactionPicker = useCallback(
    (data: EmojiData) => {
      if (onReaction && parentId && data.id) {
        onReaction(parentId, data.id);
      }
    },
    [onReaction, parentId],
  );

  const map = useMemo(
    () =>
      reactions.size
        ? Array.from(reactions.entries()).map(([reaction, users]) => (
            <Reaction
              key={reaction}
              name={reaction}
              users={users}
              isOwn={!!(userId && users.has(userId))}
              onReact={onReact}
            />
          ))
        : undefined,
    [onReact, reactions, userId],
  );

  if (!map?.length) {
    return <></>;
  }

  return (
    <Stack horizontal gap="xs" height="x3">
      {map}
      <EmojiPickerButton size="square_xs" onSelectEmoji={onReactionPicker} />
    </Stack>
  );
};

const Reaction = (props: {
  name: string;
  users?: Set<string>;
  onReact: (reaction: string) => void;
  isOwn?: boolean;
}) => {
  const onClick = useCallback(() => {
    props.onReact(props.name);
  }, [props]);

  return props.users && props.users.size ? (
    <Stack
      horizontal
      centerContent
      border={props.isOwn ? "accent" : "none"}
      cursor="pointer"
      gap="sm"
      rounded="lg"
      background="level3"
      color="gray1"
      paddingX="sm"
      onClick={onClick}
    >
      <Text size="md">{getEmoji(props.name) ?? ""}</Text>
      <Text size="sm">{props.users.size}</Text>
    </Stack>
  ) : null;
};
