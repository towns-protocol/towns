/**
 * @jest-environment jsdom
 */

import React, { useCallback } from "react";
import { generateTestingUtils } from "eth-testing";
import { ethers } from "ethers";
import { useWeb3Context, WalletStatus } from "../../src/hooks/use-web3";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useMatrixClient } from "../../src/hooks/use-matrix-client";
import { LoginStatus } from "../../src/hooks/login";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixTestApp } from "./helpers/MatrixTestApp";
import { request, Visibility } from "matrix-js-sdk";
import { MatrixTestClient } from "./helpers/MatrixTestClient";
import { useSpace } from "../../src/hooks/use-space";
import { useRoom } from "../../src/hooks/use-room";
import { Membership } from "../../src/types/matrix-types";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

describe("defaultSpaceId", () => {
  jest.setTimeout(60000);
  const homeServer = "http://localhost:8008";
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
    // set up required global for the matrix client to allow us to make http requests
    request(require("request")); // eslint-disable-line @typescript-eslint/no-var-requires
  });
  afterEach(() => {
    // Clear all mocks between tests
    testingUtils.clearAllMocks();
  });
  test("new user sees default space information", async () => {
    const jane = new MatrixTestClient("jane", homeServer);
    await jane.registerWalletAndStartClient();
    // create a room
    const defaultSpaceId = await jane.createSpace({
      spaceName: "janes room",
      visibility: Visibility.Public,
    });

    await jane.createRoom({
      roomName: "janes channel",
      visibility: Visibility.Public,
      parentSpaceId: defaultSpaceId,
    });
    // set the invite level to 0
    //await jane.setRoomInviteLevel(defaultSpaceId, 0);
    // create a wallet for bob
    const bobWallet = ethers.Wallet.createRandom();
    // setup the mocks
    testingUtils.mockChainId("0x4");
    testingUtils.mockRequestAccounts([bobWallet.address], { chainId: "0x4" });
    testingUtils.mockConnectedWallet([bobWallet.address], { chainId: "0x4" });
    testingUtils.lowLevel.mockRequest("personal_sign", async (params: any) => {
      return bobWallet.signMessage((params as string[])[0]);
    });
    // create a veiw for the wallet
    const TestDefaultRoom = () => {
      const { walletStatus } = useWeb3Context();
      const { loginStatus, loginError } = useMatrixStore();
      const { registerWallet, joinRoom, clientRunning } = useMatrixClient();
      const defaultSpace = useSpace();
      const defaultRoom = useRoom(defaultSpaceId);
      const onClickRegisterWallet = useCallback(() => {
        void registerWallet("...");
      }, [registerWallet]);
      const onClickJoinRoom = useCallback(() => {
        void joinRoom(defaultSpaceId);
      }, [joinRoom]);
      return (
        <>
          <div data-testid="walletStatus">{walletStatus}</div>
          <div data-testid="loginStatus">{loginStatus}</div>
          <div data-testid="loginError">{loginError?.message ?? ""}</div>
          <button onClick={onClickRegisterWallet}>Register</button>
          <div data-testid="spaceRoomName">
            {defaultRoom ? defaultRoom?.name : "undefined"}
          </div>
          <div data-testid="spaceName">
            {defaultSpace ? defaultSpace?.name : "undefined"}
          </div>
          <div data-testid="clientRunning">
            {clientRunning ? "true" : "false"}
          </div>
          <button onClick={onClickJoinRoom}>Join</button>
          <div data-testid="roomMembership"> {defaultRoom?.membership} </div>
          <div data-testid="spaceMembership"> {defaultSpace?.membership} </div>
          <div data-testid="channelsCount">
            {`${defaultSpace?.channelGroups.length ?? -1}`}
          </div>
          <div data-testid="channelName">
            {" "}
            {defaultSpace && defaultSpace.channelGroups.length > 0
              ? defaultSpace.channelGroups[0].channels[0].label
              : ""}{" "}
          </div>
        </>
      );
    };
    // render it
    render(
      <MatrixTestApp
        homeServerUrl={homeServer}
        defaultSpaceId={defaultSpaceId.matrixRoomId}
        defaultSpaceName="janes room"
      >
        <TestDefaultRoom />
      </MatrixTestApp>,
    );
    // get our test elements
    const walletStatus = screen.getByTestId("walletStatus");
    const loginStatus = screen.getByTestId("loginStatus");
    const clientRunning = screen.getByTestId("clientRunning");
    const spaceRoomName = screen.getByTestId("spaceRoomName");
    const spaceName = screen.getByTestId("spaceName");
    const roomMembership = screen.getByTestId("roomMembership");
    const spaceMembership = screen.getByTestId("spaceMembership");
    // const channelsCount = screen.getByTestId("channelsCount");
    // const channelName = screen.getByTestId("channelName");

    const registerButton = screen.getByRole("button", { name: "Register" });
    const joinButton = screen.getByRole("button", { name: "Join" });
    // wait for our wallet to get unlocked
    await waitFor(() =>
      expect(walletStatus).toHaveTextContent(WalletStatus.Unlocked),
    );
    // click the register button
    fireEvent.click(registerButton);
    // expect our status to change to logged in
    await waitFor(() =>
      expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn),
    );
    // expect our default room to sync, even though we haven't joined it
    await waitFor(() => expect(spaceRoomName).toHaveTextContent("janes room"), {
      timeout: 10000,
    });
    // expect our default space to sync, even though we haven't joined it
    await waitFor(() => expect(spaceName).toHaveTextContent("janes room"), {
      timeout: 10000,
    });
    // wait for the client to boot up, this is async
    await waitFor(() => expect(clientRunning).toHaveTextContent("true"));
    // expect our room membership to be empty
    expect(roomMembership).toHaveTextContent("");
    expect(spaceMembership).toHaveTextContent("");
    // click the register button
    fireEvent.click(joinButton);
    // expect our room membership to be populated
    await waitFor(
      () => expect(roomMembership).toHaveTextContent(Membership.Join),
      { timeout: 250 },
    );
    await waitFor(() =>
      expect(spaceMembership).toHaveTextContent(Membership.Join),
    );
    // todo sync public channels...
    // await waitFor(() => expect(channelsCount).toHaveTextContent("1"));
    // await waitFor(() => expect(channelName).toHaveTextContent("janes channel"));
  });
});

/* eslint-enable */
