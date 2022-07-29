import React, { useEffect } from "react";
import { useMatrixClient } from "../../../src/hooks/use-matrix-client";
import { useMyMembership } from "../../../src/hooks/use-my-membership";
import { useWeb3Context, WalletStatus } from "../../../src/hooks/use-web3";
import { useMatrixStore } from "../../../src/store/use-matrix-store";
import { RoomIdentifier } from "../../../src/types/matrix-types";

export const RegisterWallet = () => {
  const { walletStatus } = useWeb3Context();
  const { loginStatus, loginError } = useMatrixStore();
  const { clientRunning, registerWallet } = useMatrixClient();
  useEffect(() => {
    if (walletStatus == WalletStatus.Unlocked) {
      void (async () => {
        await registerWallet("login...");
      })();
    }
  }, [registerWallet, walletStatus]);
  return (
    <>
      <div data-testid="walletStatus">{walletStatus}</div>
      <div data-testid="loginStatus">{loginStatus}</div>
      <div data-testid="loginError">{loginError?.message ?? ""}</div>
      <div data-testid="clientRunning">{clientRunning ? "true" : "false"}</div>
    </>
  );
};

export const LoginWithWallet = () => {
  const { walletStatus } = useWeb3Context();
  const { loginStatus, loginError } = useMatrixStore();
  const { clientRunning, loginWithWallet } = useMatrixClient();
  useEffect(() => {
    if (walletStatus == WalletStatus.Unlocked) {
      void (async () => {
        await loginWithWallet("login...");
      })();
    }
  }, [loginWithWallet, walletStatus]);
  return (
    <>
      <div data-testid="walletStatus">{walletStatus}</div>
      <div data-testid="loginStatus">{loginStatus}</div>
      <div data-testid="loginError">{loginError?.message ?? ""}</div>
      <div data-testid="clientRunning">{clientRunning ? "true" : "false"}</div>
    </>
  );
};

interface RegisterAndJoinSpaceProps {
  spaceId: RoomIdentifier;
  channelId: RoomIdentifier;
}

export const RegisterAndJoinSpace = (props: RegisterAndJoinSpaceProps) => {
  const { spaceId, channelId } = props;
  const { clientRunning, joinRoom } = useMatrixClient();
  const mySpaceMembership = useMyMembership(channelId);
  const myChannelMembership = useMyMembership(channelId);
  useEffect(() => {
    if (clientRunning) {
      void (async () => {
        await joinRoom(spaceId);
        await joinRoom(channelId);
      })();
    }
  }, [channelId, clientRunning, joinRoom, spaceId]);
  return (
    <>
      <RegisterWallet />
      <div data-testid="spaceMembership"> {mySpaceMembership} </div>
      <div data-testid="channelMembership"> {myChannelMembership} </div>
    </>
  );
};
