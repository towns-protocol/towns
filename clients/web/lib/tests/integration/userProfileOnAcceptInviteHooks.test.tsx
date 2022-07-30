/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { generateTestingUtils } from "eth-testing";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixTestApp } from "./helpers/MatrixTestApp";
import { useMyProfile } from "../../src/hooks/use-my-profile";
import { registerAndStartClients } from "./helpers/TestUtils";
import { LoginWithWallet } from "./helpers/TestComponents";
import { Membership, RoomVisibility } from "../../src/types/matrix-types";
import { useMatrixClient } from "../../src/hooks/use-matrix-client";
import { useMyMembership } from "../../src/hooks/use-my-membership";
import { useInvites, useSpaces } from "../../src/hooks/use-space";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("userProfileOnAcceptInviteHooks", () => {
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
  /// when we accept an invite, matrix is sending us our own membership info without
  /// saturating it with the proper display name (avatar info seems correct).
  test("user sees own info after accepting an invite", async () => {
    // create clients
    const { alice, bob } = await registerAndStartClients(["alice", "bob"]);
    // save off the wallet
    const aliceWallet = alice.wallet;
    // set display name and avatar
    await alice.client.setDisplayName("Alice's your aunt");
    await alice.client.setAvatarUrl("alice.png");
    // stop alice
    alice.stopClient();
    // create a veiw for alice
    const TestUserProfileOnAcceptInvite = () => {
      const myProfile = useMyProfile();
      const { joinRoom } = useMatrixClient();
      const invites = useInvites();
      const spaces = useSpaces();
      const roomId = invites[0]?.id ?? spaces[0]?.id;
      const myMembership = useMyMembership(roomId);
      return (
        <>
          <LoginWithWallet />
          <div data-testid="myProfileName">
            {myProfile?.displayName ?? "unknown"}
          </div>
          <div data-testid="invitesCount">
            {invites.length > 0 ? invites.length.toString() : "none"}
          </div>
          <div data-testid="roomId">{roomId?.matrixRoomId ?? "none"}</div>
          <div data-testid="myMembership">{myMembership}</div>
          <button onClick={() => void joinRoom(roomId)}>Accept Invite</button>
        </>
      );
    };
    // render it
    render(
      <MatrixTestApp testingUtils={testingUtils} wallet={aliceWallet}>
        <TestUserProfileOnAcceptInvite />
      </MatrixTestApp>,
    );
    // get our test elements
    const myProfileName = screen.getByTestId("myProfileName");
    const myMembership = screen.getByTestId("myMembership");
    const invitesCount = screen.getByTestId("invitesCount");
    const acceptButton = screen.getByRole("button", { name: "Accept Invite" });
    // verify alice name is rendering
    await waitFor(() =>
      expect(myProfileName).toHaveTextContent("Alice's your aunt"),
    );
    // bob creates a room
    const roomId = await bob.createSpace({
      name: "bob's space",
      visibility: RoomVisibility.Private,
    });
    // bob invites alice to the room
    await bob.inviteUser(alice.matrixUserId!, roomId);
    // wait for the invite to show (this will transition back to 0 after the invite is accepted)
    await waitFor(() => expect(invitesCount).toHaveTextContent("1"));
    // click the accept button
    fireEvent.click(acceptButton);
    // wait for the room to be joined
    await waitFor(() =>
      expect(myMembership).toHaveTextContent(Membership.Join),
    );
    // verify alice name is rendering
    expect(myProfileName).toHaveTextContent("Alice's your aunt");
  }); // end test
}); // end describe
