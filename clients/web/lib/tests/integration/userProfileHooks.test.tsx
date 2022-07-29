/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from "react";
import { generateTestingUtils } from "eth-testing";
import { ethers } from "ethers";
import { useMatrixClient } from "../../src/hooks/use-matrix-client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixTestApp } from "./helpers/MatrixTestApp";
import { useMember } from "../../src/hooks/use-member";
import { useMyProfile } from "../../src/hooks/use-my-profile";
import { Membership, RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients, sleep } from "./helpers/TestUtils";
import { RoomMember } from "matrix-js-sdk";
import { RegisterAndJoinSpace } from "./helpers/TestComponents";
import { useMessages } from "../../src/hooks/use-messages";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("userProfileHooks", () => {
  jest.setTimeout(10000);
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
  test("user can join a room, see username and avatar info", async () => {
    // create clients
    const { alice } = await registerAndStartClients(["alice"]);
    // set display name and avatar
    await alice.client.setDisplayName("Alice's your aunt");
    await alice.client.setAvatarUrl("alice.png");
    // create a wallet for bob
    const bobWallet = ethers.Wallet.createRandom();
    // create a space
    const alicesSpaceId = await alice.createSpace({
      spaceName: "alices space",
      visibility: RoomVisibility.Public,
    });
    //
    const alicesChannelId = await alice.createRoom({
      roomName: "alices channel",
      visibility: RoomVisibility.Public,
      parentSpaceId: alicesSpaceId,
    });
    // create a veiw for bob
    const TestUserProfile = () => {
      const { setDisplayName, setAvatarUrl } = useMatrixClient();
      const myProfile = useMyProfile();
      const alicesMemberInfo = useMember(alice.matrixUserId!, alicesSpaceId);
      const messages = useMessages(alicesChannelId);
      const onClickSetProfileInfo = useCallback(async () => {
        await setDisplayName("Bob's your uncle");
        await setAvatarUrl("bob.png");
      }, [setDisplayName, setAvatarUrl]);
      return (
        <>
          <RegisterAndJoinSpace
            spaceId={alicesSpaceId}
            channelId={alicesChannelId}
          />
          <button onClick={onClickSetProfileInfo}>Set Profile Info</button>
          <div data-testid="myProfileName">
            {myProfile?.displayName ?? "unknown"}
          </div>
          <div data-testid="myProfileAvatar">
            {myProfile?.avatarUrl ?? "unknown"}
          </div>
          <div data-testid="alicesMemberName">
            {alicesMemberInfo?.name ?? "unknown"} foo
          </div>
          <div data-testid="alicesMemberAvatar">
            {alicesMemberInfo?.avatarUrl ?? "unknown"}
          </div>
          <div data-testid="messageSender">
            {messages.length > 0 ? messages[0].sender : "none"}
          </div>
        </>
      );
    };
    // render it
    render(
      <MatrixTestApp testingUtils={testingUtils} wallet={bobWallet}>
        <TestUserProfile />
      </MatrixTestApp>,
    );
    // get our test elements
    const channelMembership = screen.getByTestId("channelMembership"); // from RegisterAndJoinSpace
    const myProfileName = screen.getByTestId("myProfileName");
    const myProfileAvatar = screen.getByTestId("myProfileAvatar");
    const alicesMemberName = screen.getByTestId("alicesMemberName");
    const alicesMemberAvatar = screen.getByTestId("alicesMemberAvatar");
    const messageSender = screen.getByTestId("messageSender");
    const setProfileInfoButton = screen.getByRole("button", {
      name: "Set Profile Info",
    });
    // wait for the channel join
    await waitFor(() =>
      expect(channelMembership).toHaveTextContent(Membership.Join),
    );
    // verify alice name is rendering
    await waitFor(() =>
      expect(alicesMemberName).toHaveTextContent("Alice's your aunt"),
    );
    // verify alice avatar is rendering
    await waitFor(() =>
      expect(alicesMemberAvatar).toHaveTextContent("alice.png"),
    );
    // have bob send a message to jane
    fireEvent.click(setProfileInfoButton);
    // verify my (bob) name is rendering
    await sleep(500);
    await waitFor(() =>
      expect(myProfileName).toHaveTextContent("Bob's your uncle"),
    );
    // verify my (bob) avatar is rendering
    await waitFor(() => expect(myProfileAvatar).toHaveTextContent("bob.png"));
    // double check that alice sees the same info
    expect(
      await alice.eventually((x) =>
        x.client
          .getRoom(alicesChannelId.matrixRoomId)
          ?.getMembers()
          .some((x: RoomMember) => x.name === "Bob's your uncle"),
      ),
    ).toBe(true);
    // have alice send a message
    await alice.sendMessage(alicesChannelId, "hello");
    // expect a result
    await waitFor(() =>
      expect(messageSender).toHaveTextContent("Alice's your aunt"),
    );
  }); // end test with bob
}); // end describe
