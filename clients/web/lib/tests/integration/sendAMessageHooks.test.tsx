/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from "react";
import { useZionClient } from "../../src/hooks/use-zion-client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ZionTestApp } from "./helpers/ZionTestApp";
import { useMessages } from "../../src/hooks/use-messages";
import { Membership, RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";
import { MatrixEvent } from "matrix-js-sdk";
import { RegisterAndJoinSpace } from "./helpers/TestComponents";
import { ZionTestWeb3Provider } from "./helpers/ZionTestWeb3Provider";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("sendAMessageHooks", () => {
  jest.setTimeout(60000);
  test("user can join a room, see messages, and send messages", async () => {
    // create clients
    const { jane } = await registerAndStartClients(["jane"]);
    // create a wallet for bob
    const bobProvider = new ZionTestWeb3Provider();
    // create a space
    const janesSpaceId = await jane.createSpace({
      name: "janes space",
      visibility: RoomVisibility.Public,
    });
    //
    const janesChannelId = await jane.createChannel({
      name: "janes channel",
      visibility: RoomVisibility.Public,
      parentSpaceId: janesSpaceId,
    });
    // create a veiw for bob
    const TestRoomMessages = () => {
      const { sendMessage } = useZionClient();
      const messages = useMessages(janesChannelId);
      const onClickSendMessage = useCallback(async () => {
        await sendMessage(janesChannelId, "hello jane");
      }, [sendMessage]);
      return (
        <>
          <RegisterAndJoinSpace
            spaceId={janesSpaceId}
            channelId={janesChannelId}
          />
          <button onClick={onClickSendMessage}>Send Message</button>
          <div data-testid="message0">
            {messages.length > 0 ? messages[0].body : "empty"}
          </div>
          <div data-testid="message1">
            {messages.length > 1 ? messages[1].body : "empty"}
          </div>
        </>
      );
    };
    // render it
    render(
      <ZionTestApp provider={bobProvider}>
        <TestRoomMessages />
      </ZionTestApp>,
    );
    // get our test elements
    const channelMembership = screen.getByTestId("channelMembership");
    const message0 = screen.getByTestId("message0");
    const message1 = screen.getByTestId("message1");
    const sendMessageButton = screen.getByRole("button", {
      name: "Send Message",
    });
    // wait for the channel join
    await waitFor(() =>
      expect(channelMembership).toHaveTextContent(Membership.Join),
    );
    // have jane send a message to bob
    await jane.sendMessage(janesChannelId, "hello bob");
    // expect our message to show
    await waitFor(() => expect(message0).toHaveTextContent("hello bob"));
    // have bob send a message to jane
    fireEvent.click(sendMessageButton);
    // expect it to render as well
    await waitFor(() => expect(message1).toHaveTextContent("hello jane"));
    // expect jane to recieve the message
    expect(
      await jane.eventually(
        (x) =>
          x
            .getRoom(janesChannelId)
            ?.getLiveTimeline()
            .getEvents()
            .find(
              (event: MatrixEvent) => event.getContent()?.body === "hello jane",
            ) != undefined,
      ),
    ).toBe(true);
  });
});
