import { emojis } from "@emoji-mart/data";
import { EmojiData } from "emoji-mart";
import React, { Suspense, useCallback } from "react";
import { useZionContext } from "use-zion-client";
import { MessageReactions } from "hooks/useFixMeMessageThread";
import { Box, Stack, Text, TooltipRenderer } from "@ui";
import { EmojiPickerButton } from "@components/EmojiPickerButton";
import { ReactionTootip } from "./ReactionTooltip";

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
    <Stack horizontal height="x3" insetX="xxs">
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
  const { name, users, onReact, isOwn } = props;
  const { client } = useZionContext();
  const onClick = useCallback(() => {
    const userId = client?.getUserId();
    if (userId) {
      users?.has(userId);
      // cancel reaction
      return;
    }

    onReact(name);
  }, [client, name, onReact, users]);

  return users && users.size ? (
    <TooltipRenderer
      render={<ReactionTootip userIds={users} reaction={name} />}
      key={name}
      trigger="hover"
      placement="vertical"
    >
      {({ triggerProps }) => (
        <Box paddingX="xs" {...triggerProps} horizontal>
          <Stack
            horizontal
            centerContent
            position="relative"
            border={isOwn ? "accent" : "none"}
            gap="sm"
            rounded="lg"
            background="level3"
            color="gray1"
            paddingX="sm"
            onClick={onClick}
          >
            <Text size="md">{getNativeEmojiFromName(props.name)}</Text>
            <Text size="sm">{users.size}</Text>
          </Stack>
        </Box>
      )}
    </TooltipRenderer>
  ) : null;
};
