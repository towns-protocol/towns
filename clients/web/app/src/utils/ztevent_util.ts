import {
  MessageType,
  RoomMessageEvent,
  TimelineEvent,
  ZTEvent,
} from "use-zion-client";

export const getIsRoomMessageContent = (
  e?: TimelineEvent,
): RoomMessageEvent | undefined => {
  if (e?.content?.kind === ZTEvent.RoomMessage) {
    return e.content;
  }
};

export const getMessageBody = (
  eventId: string,
  message: RoomMessageEvent,
): string => {
  switch (message.msgType) {
    case MessageType.WenMoon:
      return `${message.content.body} 
      ${eventId}
      `;
    case MessageType.Text:
      return (
        message.content.body ??
        // here for historical reasons TODO: delete
        message.content["m.body"]
      );
    default:
      return `${message.content.body}\n*Unsupported message type* **${message.content.msgType}**`;
  }
};
