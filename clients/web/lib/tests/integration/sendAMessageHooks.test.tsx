/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect } from "react";
import { generateTestingUtils } from "eth-testing";
import { ethers } from "ethers";
import { useWeb3Context, WalletStatus } from "../../src/hooks/use-web3";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useMatrixClient } from "../../src/hooks/use-matrix-client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixTestApp } from "./helpers/MatrixTestApp";
import { useMyMembership } from "../../src/hooks/use-my-membership";
import { useMessages } from "../../src/hooks/use-messages";
import { Membership, RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients, sleep } from "./helpers/TestUtils";
import { MatrixEvent } from "matrix-js-sdk";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("sendAMessageHook", () => {
  jest.setTimeout(60000);
  const testingUtils: TestingUtils = generateTestingUtils({
    providerType: "MetaMask",
    verbose: true,
  });
  beforeAll(() => {
    // Manually inject the mocked provider in the window as MetaMask does
    Object.defineProperty(window, "ethereum", {
      value: testingUtils.getProvider(),
      writable: true,
    });
  });
  afterEach(() => {
    // Clear all mocks between tests
    testingUtils.clearAllMocks();
  });
  test("user can join a room, see messages, and send messages", async () => {
    // create clients
    const { jane } = await registerAndStartClients(["jane"]);
    // create a wallet for bob
    const bobWallet = ethers.Wallet.createRandom();
    // create a space
    const janesSpaceId = await jane.createSpace({
      spaceName: "janes space",
      visibility: RoomVisibility.Public,
    });
    //
    const janesChannelId = await jane.createRoom({
      roomName: "janes channel",
      visibility: RoomVisibility.Public,
      parentSpaceId: janesSpaceId,
    });
    // create a veiw for bob
    const TestRoomMessages = () => {
      const { walletStatus } = useWeb3Context();
      const { loginStatus, loginError } = useMatrixStore();
      const { clientRunning, registerWallet, joinRoom, sendMessage } =
        useMatrixClient();
      const myMembership = useMyMembership(janesChannelId);
      const messages = useMessages(janesChannelId);
      useEffect(() => {
        if (walletStatus == WalletStatus.Unlocked) {
          void (async () => {
            await registerWallet("login...");
          })();
        }
      }, [registerWallet, walletStatus]);
      useEffect(() => {
        if (clientRunning) {
          void (async () => {
            await joinRoom(janesSpaceId);
            await joinRoom(janesChannelId);
          })();
        }
      }, [clientRunning, joinRoom]);
      const onClickSendMessage = useCallback(async () => {
        await sendMessage(janesChannelId, "hello jane");
      }, [sendMessage]);
      return (
        <>
          <div data-testid="walletStatus">{walletStatus}</div>
          <div data-testid="loginStatus">{loginStatus}</div>
          <div data-testid="loginError">{loginError?.message ?? ""}</div>
          <div data-testid="clientRunning">
            {clientRunning ? "true" : "false"}
          </div>
          <div data-testid="channelMembership"> {myMembership} </div>
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
      <MatrixTestApp testingUtils={testingUtils} wallet={bobWallet}>
        <TestRoomMessages />
      </MatrixTestApp>,
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
          x.client
            .getRoom(janesChannelId.matrixRoomId)
            ?.getLiveTimeline()
            .getEvents()
            .find(
              (event: MatrixEvent) => event.getContent()?.body === "hello jane",
            ) != undefined,
      ),
    ).toBe(true);
  });
});
