import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMatrixStore } from "use-matrix-client";

export const SpacesIndex = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { rooms } = useMatrixStore();
  const space = spaceId && rooms ? rooms[spaceId] : undefined;

  const onCreateChannelClick = useCallback(() => {
    navigate("/spaces/" + spaceId + "/channels/new");
  }, [navigate, spaceId]);

  return space ? (
    <>
      <button onClick={onCreateChannelClick}>Create a channel</button>
    </>
  ) : (
    <h1> Space {spaceId} not found</h1>
  );
};
