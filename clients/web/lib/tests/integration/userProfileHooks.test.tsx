/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from "react";
import { useZionClient } from "../../src/hooks/use-zion-client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ZionTestApp } from "./helpers/ZionTestApp";
import { useMember } from "../../src/hooks/use-member";
import { useMyProfile } from "../../src/hooks/use-my-profile";
import { Membership, RoomVisibility } from "../../src/types/matrix-types";
import { registerAndStartClients } from "./helpers/TestUtils";
import { RoomMember } from "matrix-js-sdk";
import { RegisterAndJoinSpace } from "./helpers/TestComponents";
import { sleep } from "../../src/utils/zion-utils";
import { ZionTestWeb3Provider } from "./helpers/ZionTestWeb3Provider";
import { SpaceContextProvider } from "../../src/components/SpaceContextProvider";
import { ChannelContextProvider } from "../../src/components/ChannelContextProvider";
import { useChannelTimeline } from "../../src/hooks/use-channel-timeline";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("userProfileHooks", () => {
  jest.setTimeout(10000);
  test("user can join a room, see username and avatar info", async () => {
    // create clients
    const { alice } = await registerAndStartClients(["alice"]);
    // set display name and avatar
    await alice.setDisplayName("Alice's your aunt");
    await alice.setAvatarUrl("alice.png");
    // create a wallet for bob
    const bobProvider = new ZionTestWeb3Provider();
    // create a space
    const alicesSpaceId = await alice.createSpace({
      name: "alices space",
      visibility: RoomVisibility.Public,
    });
    //
    const alicesChannelId = await alice.createChannel({
      name: "alices channel",
      visibility: RoomVisibility.Public,
      parentSpaceId: alicesSpaceId,
    });
    // create a veiw for bob
    const TestUserProfile = () => {
      const { setDisplayName, setAvatarUrl } = useZionClient();
      const myProfile = useMyProfile();
      const alicesMemberInfo = useMember(alice.matrixUserId!, alicesSpaceId);
      const messages = useChannelTimeline();
      const onClickSetProfileInfo = useCallback(() => {
        void (async () => {
          await setDisplayName("Bob's your uncle");
          await setAvatarUrl("bob.png");
        })();
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
            {alicesMemberInfo?.name ?? "unknown"}
          </div>
          <div data-testid="alicesMemberAvatar">
            {alicesMemberInfo?.avatarUrl ?? "unknown"}
          </div>
          <div data-testid="messageSender">
            {messages[3]?.content?.kind === "m.room.message"
              ? messages[3].content.sender.displayName
              : "none"}
          </div>
          <div data-testid="allMessages">
            {messages
              .map((m) => `${m.eventType} ${m.fallbackContent}`)
              .join("\n")}
          </div>
        </>
      );
    };
    // render it
    render(
      <ZionTestApp provider={bobProvider}>
        <SpaceContextProvider spaceId={alicesSpaceId}>
          <ChannelContextProvider channelId={alicesChannelId}>
            <TestUserProfile />
          </ChannelContextProvider>
        </SpaceContextProvider>
      </ZionTestApp>,
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
        x
          .getRoom(alicesChannelId)
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
