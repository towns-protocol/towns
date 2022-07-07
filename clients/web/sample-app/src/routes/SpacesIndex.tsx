import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSpace } from "use-matrix-client";
import { List, ListItem, ListItemText } from "@mui/material";
import {
  RoomIdentifier,
  SpaceChild,
} from "use-matrix-client/dist/types/matrix-types";

export const SpacesIndex = () => {
  const { spaceSlug } = useParams();
  const navigate = useNavigate();
  const space = useSpace(spaceSlug);

  const onClickChannel = useCallback(
    (roomId: RoomIdentifier) => {
      if (space?.id.slug) {
        navigate(`/spaces/${space.id.slug}/channels/${roomId.slug}`);
      }
    },
    [space?.id.slug, navigate],
  );

  const channelItems = useMemo(() => {
    if (space) {
      return space.children.map((r: SpaceChild) => (
        <ListItem button key={r.id.slug} onClick={() => onClickChannel(r.id)}>
          <ListItemText>{r.name}</ListItemText>
        </ListItem>
      ));
    }
    return [];
  }, [space, onClickChannel]);

  const onCreateChannelClick = useCallback(() => {
    navigate("/spaces/" + space?.id.slug + "/channels/new");
  }, [navigate, space?.id.slug]);

  return space ? (
    <>
      <button onClick={onCreateChannelClick}>Create a channel</button>
      <List>{channelItems}</List>
    </>
  ) : (
    <h1> Space {spaceSlug} not found</h1>
  );
};
