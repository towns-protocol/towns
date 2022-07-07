import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Membership, RoomIdentifier, useSpaceId } from "use-matrix-client";
import { CreateSpaceChildForm } from "../components/CreateSpaceChildForm";

export const SpacesNewChannel = () => {
  console.log("spaces new channel");
  const { spaceSlug } = useParams();
  const spaceId = useSpaceId(spaceSlug);
  const navigate = useNavigate();
  const onSpaceCreated = useCallback(
    (roomId: RoomIdentifier, membership: Membership) => {
      navigate("/spaces/" + spaceId?.slug + "/channels/" + roomId.slug);
    },
    [navigate, spaceId],
  );
  return spaceId ? (
    <CreateSpaceChildForm parentSpaceId={spaceId} onClick={onSpaceCreated} />
  ) : (
    <h3>404</h3>
  );
};
