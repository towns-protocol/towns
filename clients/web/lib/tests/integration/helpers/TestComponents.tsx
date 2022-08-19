import React, { useEffect } from "react";
import { WalletStatus, useWeb3Context } from "../../../src/hooks/use-web3";

import { LoginStatus } from "../../../src/hooks/login";
import { RoomIdentifier } from "../../../src/types/matrix-types";
import { ZionAuth } from "../../../src/client/ZionClientTypes";
import { getUsernameFromId } from "../../../src/types/user-identifier";
import { useCredentialStore } from "../../../src/store/use-credential-store";
import { useMatrixStore } from "../../../src/store/use-matrix-store";
import { useMyMembership } from "../../../src/hooks/use-my-membership";
import { useZionClient } from "../../../src/hooks/use-zion-client";

export const RegisterWallet = () => {
  const { walletStatus } = useWeb3Context();
  const { loginStatus, loginError } = useMatrixStore();
  const { clientRunning, registerWallet } = useZionClient();
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
  const { clientRunning, loginWithWallet } = useZionClient();
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

interface LoginWithAuthProps {
  auth: ZionAuth;
}
export const LoginWithAuth = (props: LoginWithAuthProps) => {
  const { walletStatus } = useWeb3Context();
  const {
    loginStatus,
    loginError,
    setDeviceId,
    setUserId,
    setLoginStatus,
    setUsername,
  } = useMatrixStore();
  const { clientRunning } = useZionClient();
  const { setAccessToken } = useCredentialStore();
  useEffect(() => {
    if (walletStatus == WalletStatus.Unlocked) {
      setAccessToken(props.auth.accessToken);
      setDeviceId(props.auth.deviceId);
      setLoginStatus(LoginStatus.LoggedIn);
      setUserId(props.auth.userId);
      setUsername(getUsernameFromId(props.auth.userId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletStatus]);
  return (
    <>
      <div data-testid="walletStatus">{walletStatus}</div>
      <div data-testid="loginStatus">{loginStatus}</div>
      <div data-testid="loginError">{loginError?.message ?? ""}</div>
      <div data-testid="clientRunning">{clientRunning ? "true" : "false"}</div>
    </>
  );
};

export const RegisterAndJoinSpace = (props: RegisterAndJoinSpaceProps) => {
  const { spaceId, channelId } = props;
  const { clientRunning, joinRoom } = useZionClient();
  const mySpaceMembership = useMyMembership(spaceId);
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
