import { Box, Grid, Theme, Typography } from "@mui/material";
import {
  RoomIdentifier,
  useMatrixClient,
  useMatrixStore,
} from "use-matrix-client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatMessages } from "./ChatMessages";
import { Invite } from "./Invite";
import { InviteForm } from "./InviteForm";
import { LeaveRoom } from "./LeaveRoom";

interface Props {
  roomId: RoomIdentifier;
  membership: string;
  onClickLeaveRoom: () => void;
  goToRoom: (roomId: RoomIdentifier) => void;
}

export function Chat(props: Props): JSX.Element {
  const { rooms } = useMatrixStore();
  const { inviteUser, leaveRoom, joinRoom, sendMessage } = useMatrixClient();
  const [showInviteForm, setShowInviteForm] = useState<boolean>(false);

  const onClickLeaveRoom = useCallback(async () => {
    await leaveRoom(props.roomId);
    props.onClickLeaveRoom();
  }, [leaveRoom, props]);

  const onClickOpenInviteForm = useCallback(() => {
    setShowInviteForm(true);
  }, []);

  const onClickCloseInviteForm = useCallback(() => {
    setShowInviteForm(false);
  }, []);

  const onClickSendInvite = useCallback(
    async (roomId: RoomIdentifier, inviteeId: string) => {
      setShowInviteForm(false);
      await inviteUser(roomId, inviteeId);
    },
    [inviteUser],
  );

  const onClickSendMessage = useCallback(
    async (roomId: RoomIdentifier, message: string) => {
      await sendMessage(roomId, message);
    },
    [sendMessage],
  );

  const onClickJoinRoom = useCallback(
    async (roomId: RoomIdentifier) => {
      await joinRoom(roomId);
      props.goToRoom(roomId);
    },
    [joinRoom, props],
  );

  const roomName = useMemo(() => {
    if (rooms) {
      const room = rooms[props.roomId.slug];
      if (room) {
        return room.name;
      }
    }
    return "";
  }, [props.roomId, rooms]);

  useEffect(() => {
    setShowInviteForm(false);
  }, [props.roomId]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      sx={{
        height: { xs: "140px" },
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={10} md={10}>
          <Typography variant="h6" component="span" sx={headerStyle}>
            {roomName}
          </Typography>
        </Grid>
        <Grid item xs={1} md={1}>
          <Invite onClick={onClickOpenInviteForm} />
        </Grid>
        <Grid item xs={1} md={1}>
          <LeaveRoom onClick={onClickLeaveRoom} />
        </Grid>
      </Grid>
      {showInviteForm ? (
        <InviteForm
          roomId={props.roomId}
          roomName={roomName}
          sendInvite={onClickSendInvite}
          onClickCancel={onClickCloseInviteForm}
        />
      ) : (
        <ChatMessages
          roomId={props.roomId}
          membership={props.membership}
          sendMessage={onClickSendMessage}
          joinRoom={onClickJoinRoom}
        />
      )}
    </Box>
  );
}

const headerStyle = {
  padding: (theme: Theme) => theme.spacing(1),
  gap: (theme: Theme) => theme.spacing(1),
};
