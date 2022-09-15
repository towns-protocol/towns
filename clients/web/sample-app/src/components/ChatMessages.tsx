import {
  Box,
  Button,
  Divider,
  TextField,
  Theme,
  Typography,
} from "@mui/material";
import {
  Membership,
  RoomIdentifier,
  TimelineEvent,
  useZionClient,
  useZionContext,
  ZTEvent,
} from "use-zion-client";
import { useCallback, useState } from "react";

import { AcceptInvitation } from "./AcceptInvitation";

interface Props {
  roomId: RoomIdentifier;
  timeline: TimelineEvent[];
  membership: string;
  sendMessage: (roomId: RoomIdentifier, message: string) => Promise<void>;
  joinRoom: (roomId: RoomIdentifier) => Promise<void>;
}

export function ChatMessages(props: Props): JSX.Element {
  const { timeline, membership, roomId, sendMessage, joinRoom } = props;
  const { sendReadReceipt, scrollback } = useZionClient();
  const { unreadCounts } = useZionContext();
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const hasUnread =
    membership === Membership.Join &&
    timeline.length > 0 &&
    unreadCounts[roomId.matrixRoomId] > 0;

  const onTextChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentMessage(event.target.value);
    },
    [],
  );

  const onKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && currentMessage) {
        await sendMessage(roomId, currentMessage);
        setCurrentMessage("");
      }
    },
    [currentMessage, roomId, sendMessage],
  );

  const onClickLoadMore = useCallback(() => {
    void scrollback(roomId);
  }, [scrollback, roomId]);

  const onClickMarkAsRead = useCallback(() => {
    void sendReadReceipt(roomId, timeline[timeline.length - 1].eventId);
  }, [roomId, sendReadReceipt, timeline]);

  const onJoinRoom = useCallback(() => {
    joinRoom(roomId);
  }, [joinRoom, roomId]);

  const chatMessages = () => {
    if (membership === Membership.Invite) {
      return <AcceptInvitation roomId={roomId} joinRoom={joinRoom} />;
    } else if (membership === Membership.Join) {
      if (timeline.length > 0) {
        return (
          <>
            {timeline[0].eventType !== ZTEvent.RoomCreate && (
              <Typography
                key={-1}
                display="block"
                variant="body1"
                component="button"
                onClick={onClickLoadMore}
                sx={buttonStyle}
              >
                Load More
              </Typography>
            )}
            {timeline.map((m: TimelineEvent, index: number) => (
              <Typography
                key={index}
                display="block"
                variant="body1"
                component="span"
                sx={messageStyle}
              >
                {`${formatEvent(m)}`}
              </Typography>
            ))}
            {hasUnread && (
              <Typography
                key={timeline.length}
                display="block"
                variant="body1"
                component="button"
                onClick={onClickMarkAsRead}
                sx={buttonStyle}
              >
                Mark as Read
              </Typography>
            )}
          </>
        );
      } else {
        return <NoMessages />;
      }
    } else {
      return <MissingMembershipInfo onJoinRoom={onJoinRoom} />;
    }
  };

  return (
    <Box display="flex" flexGrow="1" flexDirection="column">
      {chatMessages()}
      <Box display="flex" flexDirection="row" flexGrow={1} />
      {membership === Membership.Join ? (
        <>
          <Divider />
          <Box sx={messageStyle}>
            <TextField
              id="filled-basic"
              label="Type message here"
              variant="filled"
              fullWidth={true}
              onChange={onTextChanged}
              onKeyDown={onKeyDown}
              value={currentMessage}
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
}

const NoMessages = () => (
  <Typography
    display="block"
    variant="body1"
    component="span"
    sx={messageStyle}
  >
    There are no messages.
  </Typography>
);

const MissingMembershipInfo = (props: { onJoinRoom: () => void }) => (
  <>
    <Typography
      display="block"
      variant="body1"
      component="span"
      sx={messageStyle}
    >
      We don't have membership information for this room
    </Typography>
    <Button variant="contained" onClick={props.onJoinRoom}>
      Join Room
    </Button>
  </>
);

function formatEvent(event: TimelineEvent): string {
  switch (event.content?.kind) {
    case ZTEvent.RoomMessage:
      return `${event.content.sender.displayName}: ${event.content.body}`;
    default:
      return event.fallbackContent;
  }
}

const messageStyle = {
  padding: (theme: Theme) => theme.spacing(1),
  gap: (theme: Theme) => theme.spacing(1),
};

const buttonStyle = {
  padding: (theme: Theme) => theme.spacing(0),
  gap: (theme: Theme) => theme.spacing(0),
};
