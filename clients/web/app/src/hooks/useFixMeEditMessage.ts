import { RelationType } from "matrix-js-sdk";
import { useMemo } from "react";
import { RoomMessage } from "use-zion-client";

/**
 * FIXME: hack to get edits showing but we should ultimately let the SDK do this
 * internally - hopefully using `timelineSet` would fix this automagically
 */
export const useEditedMessages = (messages: RoomMessage[]) => {
  const editedMessages = useMemo(
    () =>
      messages.reduce((messages, m) => {
        if (m.content["m.relates_to"]?.rel_type === RelationType.Replace) {
          const parentEventId = m.content["m.relates_to"].event_id;
          const parentEvent = messages.find((m) => m.eventId === parentEventId);
          if (parentEvent) {
            // replace parent by edit (inserts and deletes parent)
            messages.splice(messages.indexOf(parentEvent), 1, m);
            return messages;
          }
        }
        return [...messages, m];
      }, [] as RoomMessage[]),
    [messages],
  );
  return { editedMessages };
};
