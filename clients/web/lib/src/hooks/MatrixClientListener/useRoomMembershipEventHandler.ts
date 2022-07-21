import { MatrixClient, MatrixEvent, RoomMember } from "matrix-js-sdk";
import { MutableRefObject, useCallback, useEffect, useState } from "react";
import {
  makeRoomIdentifier,
  Membership,
  RoomIdentifier,
} from "../../types/matrix-types";
import { useMatrixStore } from "../../store/use-matrix-store";

interface SyncMembership {
  roomId: RoomIdentifier;
  userId: string;
  membership: Membership;
}

export const useRoomMembershipEventHandler = (
  matrixClientRef: MutableRefObject<MatrixClient | undefined>,
) => {
  const { joinRoom, leaveRoom, setRoom, updateMembership } = useMatrixStore();

  const [syncInfo, setSyncInfo] = useState<SyncMembership>();

  useEffect(() => {
    if (matrixClientRef.current && syncInfo) {
      const room = matrixClientRef.current.getRoom(
        syncInfo.roomId.matrixRoomId,
      );
      if (room) {
        setRoom(room);
      }
      updateMembership(
        syncInfo.roomId,
        syncInfo.userId,
        syncInfo.membership,
        syncInfo.userId === matrixClientRef.current.getUserId(),
      );
    }
  }, [matrixClientRef, setRoom, syncInfo, updateMembership]);

  const handleRoomMembershipEvent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (event: MatrixEvent, member: RoomMember, oldMembership: string | null) => {
      console.log(`RoomMember.membership event`, {
        eventType: event.getType(),
        userId: member.userId,
        roomId: member.roomId,
        membership: member.membership,
      });
      const client = matrixClientRef.current;
      if (!client) {
        console.log(`matrixClientRef.current is undefined`);
        return;
      }

      const roomId = makeRoomIdentifier(member.roomId);

      switch (member.membership) {
        case Membership.Invite: {
          setSyncInfo({
            roomId: roomId,
            userId: member.userId,
            membership: member.membership as Membership,
          });
          break;
        }
        case Membership.Join: {
          joinRoom(roomId, member.userId, member.userId === client.getUserId());
          setSyncInfo({
            roomId: roomId,
            userId: member.userId,
            membership: member.membership as Membership,
          });
          break;
        }
        case Membership.Leave: {
          leaveRoom(
            roomId,
            member.userId,
            member.userId === client.getUserId(),
          );
          break;
        }
        default:
          console.log("Unhandled membership event", event);
          break;
      }
    },
    [joinRoom, leaveRoom, matrixClientRef],
  );

  return handleRoomMembershipEvent;
};
