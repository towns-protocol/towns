import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMatrixStore } from "use-matrix-client";

export const RoomSettings = () => {
  const { spaceSlug, roomSlug } = useParams();
  const { rooms } = useMatrixStore();

  // if we have a room id, use it, otherwise pull up the space id
  const targetId = useMemo(() => roomSlug || spaceSlug, [roomSlug, spaceSlug]);

  const room = useMemo(
    () => (targetId && rooms ? rooms[targetId] : undefined),
    [rooms, targetId],
  );

  return room ? (
    <>
      <h2>Settings</h2>
      <p>
        <b>RoomId:</b> {room.id.matrixRoomId}
      </p>
      <p>
        <b>IsSpaceRoom:</b> {room.isSpaceRoom ? "true" : "false"}
      </p>
    </>
  ) : (
    <div>
      <h2>Room Not Found</h2>
    </div>
  );
};
