import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMatrixStore, Space } from "use-matrix-client";
import { List, ListItem, ListItemText } from "@mui/material";
import { SpaceChild } from "use-matrix-client/dist/types/matrix-types";

export const SpacesIndex = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { spaces } = useMatrixStore();
  const [space, setSpace] = useState<Space | undefined>(undefined);

  useEffect(() => {
    setSpace(spaceId && spaces ? spaces[spaceId] : undefined);
  }, [spaceId, spaces]);

  const onClickChannel = useCallback(
    (roomId: string) => {
      if (spaceId) {
        navigate(`/spaces/${spaceId}/rooms/${roomId}`);
      }
    },
    [spaceId, navigate],
  );

  const channelItems = useMemo(() => {
    if (space) {
      console.log("mapping", space.children);
      return space.children.map((r: SpaceChild) => (
        <ListItem
          button
          key={r.roomId}
          onClick={() => onClickChannel(r.roomId)}
        >
          <ListItemText>{r.name}</ListItemText>
        </ListItem>
      ));
    }
    return [];
  }, [space, onClickChannel]);

  const onCreateChannelClick = useCallback(() => {
    navigate("/spaces/" + spaceId + "/channels/new");
  }, [navigate, spaceId]);

  return space ? (
    <>
      <button onClick={onCreateChannelClick}>Create a channel</button>
      <List>{channelItems}</List>
    </>
  ) : (
    <h1> Space {spaceId} not found</h1>
  );
};
