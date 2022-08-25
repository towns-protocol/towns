import {
  Channel,
  ChannelGroup,
  RoomIdentifier,
  useSpace,
  useZionClient,
} from "use-zion-client";
import { List, ListItem, ListItemText } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

import { SpaceSettings } from "./SpaceSettings";
import { useCallback, useMemo } from "react";

export const SpacesIndex = () => {
  console.log("SPACES INDEX");
  const { spaceSlug } = useParams();
  const navigate = useNavigate();
  const space = useSpace(spaceSlug);
  const { leaveRoom } = useZionClient();

  const onClickSettings = useCallback(() => {
    if (spaceSlug) {
      navigate("/spaces/" + spaceSlug + "/settings");
    }
  }, [spaceSlug, navigate]);

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
      <List>{channelItems}</List>
    </>
  ) : (
    <h1> Space {spaceSlug} not found</h1>
  );
};
