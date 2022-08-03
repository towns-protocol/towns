import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useSpace,
  ChannelGroup,
  Channel,
  RoomIdentifier,
} from "use-zion-client";
import { List, ListItem, ListItemText } from "@mui/material";

export const SpacesIndex = () => {
  const { spaceSlug } = useParams();
  const navigate = useNavigate();
  const space = useSpace(spaceSlug);
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

  return space ? (
    <>
      <p>
        <button onClick={onClickSettings}>Space settings</button>
      </p>
      <p>
        <button onClick={onCreateChannelClick}>Create a channel</button>
      </p>
      <List>{channelItems}</List>
    </>
  ) : (
    <h1> Space {spaceSlug} not found</h1>
  );
};
