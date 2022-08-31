import {
  Channel,
  ChannelGroup,
  RoomIdentifier,
  useMyMembership,
  useSpaceData,
  useSpaceTimeline,
  useZionClient,
} from "use-zion-client";
import { List, ListItem, ListItemText } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { SpaceSettings } from "./SpaceSettings";
import { useCallback, useMemo } from "react";
import { ChatMessages } from "../components/ChatMessages";

export const SpacesIndex = () => {
  console.log("SPACES INDEX");
  const navigate = useNavigate();
  const space = useSpaceData();
  const membership = useMyMembership(space?.id);
  const timeline = useSpaceTimeline();
  const { leaveRoom, sendMessage } = useZionClient();

  const onClickSettings = useCallback(() => {
    if (space?.id.slug) {
      navigate("/spaces/" + space.id.slug + "/settings");
    }
  }, [space?.id.slug, navigate]);

  const onClickChannel = useCallback(
    (roomId: RoomIdentifier) => {
      if (space?.id.slug) {
        navigate(`/spaces/${space.id.slug}/channels/${roomId.slug}/`);
      }
    },
    [space?.id.slug, navigate],
  );

  const channelItems = useMemo(() => {
    if (space) {
      return space.channelGroups.flatMap((r: ChannelGroup) =>
        r.channels.map((c: Channel) => (
          <ListItem button key={c.id.slug} onClick={() => onClickChannel(c.id)}>
            <ListItemText>{c.label}</ListItemText>
          </ListItem>
        )),
      );
    }
    return [];
  }, [space, onClickChannel]);

  const onCreateChannelClick = useCallback(() => {
    navigate("/spaces/" + space?.id.slug + "/channels/new");
  }, [navigate, space?.id.slug]);

  const onClickInvite = useCallback(() => {
    navigate("/spaces/" + space?.id.slug + "/invite");
  }, [navigate, space?.id.slug]);

  const onClickLeaveSpace = useCallback(async () => {
    if (space?.id) {
      await leaveRoom(space.id);
      navigate("/");
    }
  }, [leaveRoom, navigate, space?.id]);

  const onClickSendMessage = useCallback(
    (roomId: RoomIdentifier, message: string) => {
      return sendMessage(roomId, message);
    },
    [sendMessage],
  );

  const onClickJoinRoom = useCallback(() => {
    throw new Error("Not implemented");
  }, []);

  return space ? (
    <>
      <div>
        <button onClick={onClickSettings}>Space settings</button>
      </div>
      <div>
        <button onClick={onCreateChannelClick}>Create a channel</button>
      </div>
      <div>
        <button onClick={onClickInvite}>Invite to space</button>
      </div>
      <div>
        <button onClick={onClickLeaveSpace}>Leave space</button>
      </div>
      <div>
        {space?.id ? <SpaceSettings spaceId={space.id.matrixRoomId} /> : null}
      </div>
      <h3>Channels:</h3>
      <List>{channelItems}</List>
      <h3>Space Messages</h3>
      <ChatMessages
        roomId={space.id}
        timeline={timeline}
        membership={membership}
        sendMessage={onClickSendMessage}
        joinRoom={onClickJoinRoom}
      />
    </>
  ) : (
    <h1> Space not found</h1>
  );
};
