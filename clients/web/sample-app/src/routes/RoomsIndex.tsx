import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Room, useMatrixStore } from "use-matrix-client";
import { Chat } from "../components/Chat";

export const RoomsIndex = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { rooms } = useMatrixStore();
  const [currentChatRoom, setCurrentChatRoom] = useState<Room | undefined>();

  useEffect(() => {
    setCurrentChatRoom(roomId && rooms ? rooms[roomId] : undefined);
  }, [roomId, rooms]);

  const onClickLeaveRoom = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const goToRoom = useCallback(
    (roomId: string) => {
      navigate("/rooms/" + roomId);
    },
    [navigate],
  );

  return currentChatRoom ? (
    <Chat
      roomId={currentChatRoom.roomId}
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
