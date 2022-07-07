import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoomIdentifier, useMatrixStore } from "use-matrix-client";
import { Chat } from "../components/Chat";

export const RoomsIndex = () => {
  const navigate = useNavigate();
  const { roomSlug } = useParams();
  const { rooms } = useMatrixStore();
  const currentChatRoom = useMemo(
    () => (roomSlug && rooms ? rooms[roomSlug] : undefined),
    [roomSlug, rooms],
  );

  const onClickLeaveRoom = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const goToRoom = useCallback(
    (roomId: RoomIdentifier) => {
      navigate("/rooms/" + roomId.slug);
    },
    [navigate],
  );

  return currentChatRoom ? (
    <Chat
      roomId={currentChatRoom.id}
      membership={currentChatRoom.membership}
      onClickLeaveRoom={onClickLeaveRoom}
      goToRoom={goToRoom}
    />
  ) : (
    <div>
      <h2>Room Not Found</h2>
    </div>
  );
};
