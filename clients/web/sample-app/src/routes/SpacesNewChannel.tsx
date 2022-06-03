import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Membership } from "use-matrix-client";
import { CreateSpaceChildForm } from "../components/CreateSpaceChildForm";

export const SpacesNewChannel = () => {
  console.log("spaces new channel");
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const onSpaceCreated = useCallback(
    (roomId: string, membership: Membership) => {
      navigate("/spaces/" + spaceId + "/channels/" + roomId);
    },
    [navigate, spaceId],
  );
  return spaceId ? (
    <CreateSpaceChildForm parentSpaceId={spaceId} onClick={onSpaceCreated} />
  ) : (
    <h3>404</h3>
  );
};
