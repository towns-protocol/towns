/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ZionTestApp } from "./helpers/ZionTestApp";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useZionClient } from "../../src/hooks/use-zion-client";
import { registerAndStartClients } from "./helpers/TestUtils";
import { useSpace } from "../../src/hooks/use-space";
import { RoomIdentifier, RoomVisibility } from "../../src/types/matrix-types";
import { LoginStatus } from "../../src/hooks/login";

describe("spaceHierarchyHooks", () => {
  jest.setTimeout(10000);
  test("create a space with two users, have alice create a child channel, ensure bob sees it", async () => {
    // create clients
    const { alice, bob } = await registerAndStartClients(["alice", "bob"]);
    // bob creates a space
    const roomId = await bob.createSpace({
      name: "bob's space",
      visibility: RoomVisibility.Public,
    });
    // and a channel
    await bob.createChannel({
      name: "bob's channel",
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
      const { loginWithWallet } = useZionClient();
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
      <ZionTestApp provider={bob.provider}>
        <SpaceChannelsContent roomId={roomId} />
      </ZionTestApp>,
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
    await alice.createChannel({
      name: "alice's channel",
      visibility: RoomVisibility.Public,
      parentSpaceId: roomId,
    });
    // wait for the space child count to change
    await waitFor(() => expect(spaceChildCount).toHaveTextContent("2"), {
      timeout: 3000,
    });
  });
});
