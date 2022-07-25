/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { generateTestingUtils } from "eth-testing";
import { MatrixTestApp } from "./helpers/MatrixTestApp";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useMatrixClient } from "../../src/hooks/use-matrix-client";
import { registerAndStartClients } from "./helpers/TestUtils";
import { useSpace } from "../../src/hooks/use-space";
import { RoomIdentifier, RoomVisibility } from "../../src/types/matrix-types";
import { LoginStatus } from "../../src/hooks/login";

describe("spaceChildUpdates", () => {
  jest.setTimeout(10000);
  const testingUtils = generateTestingUtils({
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
  test("create a space with two users, have alice create a child channel, ensure bob sees it", async () => {
    // create clients
    const { alice, bob } = await registerAndStartClients(["alice", "bob"]);
    // bob creates a space
    const roomId = await bob.createSpace({
      spaceName: "bob's space",
      visibility: RoomVisibility.Public,
    });
    // and a channel
    await bob.createRoom({
      roomName: "bob's channel",
      visibility: RoomVisibility.Public,
      parentSpaceId: roomId,
    });
    // set the space child prop on the room to 0 so that anyone can make channels
    await bob.setPowerLevel(roomId, "m.space.child", 0);
    // stop bob, we'll be using him in the react component
    bob.stopClient();
    // alice joins the room
    await alice.joinRoom(roomId);
    // create a power levels view for bob
    const SpaceChannelsContent = (props: { roomId: RoomIdentifier }) => {
      const { loginStatus, loginError } = useMatrixStore();
      const { loginWithWallet } = useMatrixClient();
      const space = useSpace(props.roomId);
      // effect to log in
      useEffect(() => {
        void loginWithWallet("login...");
      }, [loginWithWallet]);
      // content
      return (
        <>
          <div data-testid="loginStatus">{loginStatus}</div>
          <div data-testid="loginError">{loginError?.message ?? ""}</div>
          <div data-testid="spaceId">{space?.id.matrixRoomId}</div>
          <div data-testid="spaceChildCount">
            {space?.channelGroups && space?.channelGroups?.length > 0
              ? space?.channelGroups[0].channels.length.toString()
              : "undefined"}
          </div>
        </>
      );
    };
    // render it
    render(
      <MatrixTestApp testingUtils={testingUtils} wallet={bob.wallet}>
        <SpaceChannelsContent roomId={roomId} />
      </MatrixTestApp>,
    );
    // gather our test elements
    const loginStatus = screen.getByTestId("loginStatus");
    const spaceChildCount = screen.getByTestId("spaceChildCount");
    // wait for registration
    await waitFor(() =>
      expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn),
    );
    // expect the initial space child count to be 1
    await waitFor(() => expect(spaceChildCount).toHaveTextContent("1"));
    // have alice create a channel
    await alice.createRoom({
      roomName: "alice's channel",
      visibility: RoomVisibility.Public,
      parentSpaceId: roomId,
    });
    // wait for the space child count to change
    await waitFor(() => expect(spaceChildCount).toHaveTextContent("2"), {
      timeout: 3000,
    });
  });
});
