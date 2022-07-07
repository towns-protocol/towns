import { Allotment } from "allotment";
import React, { useCallback, useMemo } from "react";
import { useOutlet, useParams } from "react-router-dom";
import { useMatrixClient, useMatrixStore } from "use-matrix-client";
import { MessageList } from "@components/MessageScroller";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";
import { useSpaceData } from "hooks/useSpaceData";

export const SpacesChannel = () => {
  const { spaceSlug, channelSlug } = useParams();
  const { sizes, onSizesChange } = usePersistPanes(["channel", "right"]);
  const outlet = useOutlet();
  const { allMessages } = useMatrixStore();
  const { sendMessage } = useMatrixClient();
  const space = useSpaceData(spaceSlug);

  const channelMessages = useMemo(
    () => (allMessages && channelSlug ? allMessages[channelSlug] ?? [] : []),
    [allMessages, channelSlug],
  );

  const channelGroup = useMemo(
    () =>
      space?.channelGroups.find((g) =>
        g.channels.find((c) => c.id.slug === channelSlug),
      ),
    [space?.channelGroups, channelSlug],
  );

  const channel = useMemo(
    () => channelGroup?.channels.find((c) => c.id.slug === channelSlug),
    [channelGroup?.channels, channelSlug],
  );

  const onSend = useCallback(
    (value: string) => {
      if (value && channel?.id) {
        sendMessage(channel?.id, value);
      }
    },
    [channel?.id, sendMessage],
  );

  return (
    <Stack horizontal minHeight="100%">
      <Allotment onChange={onSizesChange}>
        <Allotment.Pane>
          <Box grow height="100%">
            <Stack grow>
              <MessageList key={channelSlug} messages={channelMessages} />
              <Box paddingBottom="lg" paddingX="lg">
                <RichTextEditor
                  autoFocus
                  initialValue=""
                  placeholder={`Send a message to #${channel?.label}`}
                  onSend={onSend}
                />
              </Box>
            </Stack>
          </Box>
        </Allotment.Pane>
        {outlet && (
          <Allotment.Pane
            minSize={300}
            maxSize={640}
            preferredSize={sizes[1] || 320}
          >
            {outlet}
          </Allotment.Pane>
        )}
      </Allotment>
    </Stack>
  );
};

// const FakeMessages = () => (
//   <>
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" />}
//       name="sunsoutapersout"
//       date="Today at 11:01AM"
//       reactions={{ "👋": 20 }}
//     >
//       <p>
//         gm! name is francine groves and I'm a big nft fan. I currently moderate
//         for Veefriends, Boss Beauties, Fame Ladies, BFF, Flyfish Club, Legacy
//         Leaders and All Around Artsy. Soon to add my own project to that list.
//       </p>
//       <p>
//         I'm a farmer and herbalist (also pagan and ordained), own a digital
//         marketing agency and am a musician. Husband and I run a YouTube channel
//         about our farm and I'm about to start another about marketing and nft's.
//       </p>
//     </Message>
//     <Divider label="Today" />
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_30.png" />}
//       name="sunsoutapersout"
//       date="Today at 11:01AM"
//       replies={{ userIds: [2, 3, 4], fakeLength: 150 }}
//     >
//       <Paragraph>How are you all doing today?</Paragraph>
//     </Message>
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" />}
//       name="sunsoutapersout"
//       date="Today at 11:01AM"
//       reactions={{ "👀": 20, "🤑": 2 }}
//     >
//       <Paragraph>
//         I'm a farmer and herbalist (also pagan and ordained), own a digital
//         marketing agency and am a musician. Husband and I run a YouTube channel
//         about our farm and I'm about to start another about marketing and nft's.
//       </Paragraph>
//     </Message>
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_2.png" />}
//       name="deiguy"
//       date="Today at 12:01AM"
//     >
//       <Paragraph>
//         Channel about our farm and I'm about to start another about marketing
//         and nft's.
//       </Paragraph>
//     </Message>
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_28.png" />}
//       name="deiguy"
//       date="Today at 12:01AM"
//     >
//       <Paragraph>Nope!</Paragraph>
//     </Message>
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_2.png" />}
//       name="deiguy"
//       date="Today at 12:01AM"
//     >
//       <Paragraph>Nope!</Paragraph>
//     </Message>
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_39.png" />}
//       name="deiguy"
//       date="Today at 12:01AM"
//     >
//       <Paragraph>Nope!</Paragraph>
//     </Message>
//     <Message
//       condensed
//       avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_2.png" />}
//       name="deiguy"
//       date="Today at 12:01AM"
//     >
//       <Paragraph>
//         Yes arm and I'm about to start another about marketing
//       </Paragraph>
//     </Message>
//   </>
// );
