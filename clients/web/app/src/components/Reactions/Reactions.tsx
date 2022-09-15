import { EmojiData } from "emoji-mart";
import React, { Suspense, useCallback } from "react";
import { emojis } from "@emoji-mart/data";
import { EmojiPickerButton } from "@components/EmojiPickerButton";
import { Stack, Text } from "@ui";
import { MessageReactions } from "hooks/useFixMeMessageThread";

type Emojis = { [key: string]: typeof emojis[keyof typeof emojis] };

export const getNativeEmojiFromName = (name: string, skinIndex = 0) => {
  const emoji = (emojis as Emojis)?.[name];
  const skin = emoji?.skins[skinIndex < emoji.skins.length ? skinIndex : 0];
  return skin?.native ?? name;
};

type Props = {
  reactions: MessageReactions;
  userId?: string | null;
  parentId?: string;
  onReaction?: (eventId: string, name: string) => void;
};

export const Reactions = (props: Props) => {
  const { userId, parentId, reactions, onReaction } = props;

  const onReactionPicker = useCallback(
    (data: EmojiData) => {
      if (onReaction && parentId && data.id) {
        onReaction(parentId, data.id);
      }
    },
    [onReaction, parentId],
  );

  return (
    <Stack horizontal gap="xs" height="x3">
      <Suspense>
        <ReactionRow
          userId={userId}
          parentId={parentId}
          reactions={reactions}
          onReaction={onReaction}
        />
      </Suspense>
      <EmojiPickerButton size="square_xs" onSelectEmoji={onReactionPicker} />
    </Stack>
  );
};

const ReactionRow = ({
  reactions,
  userId,
  onReaction,
  parentId,
}: {
  reactions: MessageReactions;
  userId?: Props["userId"];
  onReaction: Props["onReaction"];
  parentId?: Props["parentId"];
}) => {
  const onReact = useCallback(
    (reaction: string) => {
      if (onReaction && parentId) {
        onReaction(parentId, reaction);
      }
    },
    [onReaction, parentId],
  );

  const map = reactions.size
    ? Array.from(reactions.entries()).map(([reaction, users]) => (
        <Reaction
          key={reaction}
          name={reaction}
          users={users}
          isOwn={!!(userId && users.has(userId))}
          onReact={onReact}
        />
      ))
    : undefined;

  return <>{map}</>;
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
      <Text size="md">{getNativeEmojiFromName(props.name)}</Text>
      <Text size="sm">{props.users.size}</Text>
    </Stack>
  ) : null;
};
