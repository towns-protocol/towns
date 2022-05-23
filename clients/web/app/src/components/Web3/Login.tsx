import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LoginStatus,
  WalletStatus,
  useMatrixClient,
  useMatrixStore,
  useWeb3Context,
} from "use-matrix-client";
import { Button, Stack } from "@ui";

const StatementToSign = `Click to sign in and accept the Harmony Terms of Service: https://harmony.xyz/tos.

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.`;

export const Login = () => {
  const [showError, setShowError] = useState<string | undefined>(undefined);
  const { getIsWalletIdRegistered, loginWithWallet, registerWallet } =
    useMatrixClient();
  const { loginStatus, loginError } = useMatrixStore();
  const { requestAccounts, walletStatus } = useWeb3Context();
  const [walletRegistered, setWalletRegistered] = useState<boolean>(true);

  const onConnectClick = useCallback(() => {
    switch (walletStatus) {
      case WalletStatus.Error:
      case WalletStatus.Unknown:
        requestAccounts();
        break;
      case WalletStatus.RequestUnlock:
        console.log("Connecting wallet");
        break;
      case WalletStatus.StillRequestingUnlock:
        console.log("Connecting wallet - please unlock your wallet provider");
        break;
      default:
        break;
    }
  }, [requestAccounts, walletStatus]);

  const onLoginWithWallet = useCallback(
    async function () {
      loginWithWallet(StatementToSign);
    },
    [loginWithWallet]
  );

  const onRegisterNewWallet = useCallback(
    async function () {
      registerWallet(StatementToSign);
    },
    [registerWallet]
  );

  useEffect(() => {
    if (loginError?.message) {
      console.log("loginError: ", loginError.message);
    }
  }, [loginError]);

  useEffect(() => {
    if (showError) {
      console.log(showError);
    }
  }, [showError]);

  const registerButton = useMemo(() => {
    switch (walletStatus) {
      case WalletStatus.Unlocked:
        if (loginStatus === LoginStatus.Registering) {
          return <span>"..."</span>;
        } else if (loginStatus === LoginStatus.LoggedOut) {
          return (
            <Button onClick={onRegisterNewWallet}>Register new wallet</Button>
          );
        }
        break;
      default:
        break;
    }
  }, [loginStatus, onRegisterNewWallet, walletStatus]);

  const signInButton = useMemo(() => {
    console.log("Web3 walletStatus", walletStatus);
    switch (walletStatus) {
      case WalletStatus.Error:
        return (
          <Stack
            horizontal
            borderBottom
            paddingX="md"
            height="height_xl"
            gap="sm"
            justifyContent="spaceBetween"
            alignItems="center"
          >
            <span>Error...</span>{" "}
            <Button onClick={onConnectClick}>Connect Wallet</Button>
          </Stack>
        );
      case WalletStatus.Unknown:
        return <Button onClick={onConnectClick}>Connect Wallet</Button>;
      case WalletStatus.Unlocked:
        if (loginStatus === LoginStatus.LoggingIn) {
          return <span>"..."</span>;
        } else if (loginStatus === LoginStatus.LoggedOut) {
          return (
            <Button onClick={onLoginWithWallet}>Sign in with wallet</Button>
          );
        }
        break;
      case WalletStatus.RequestUnlock:
        return <Button onClick={onConnectClick}>Connecting wallet</Button>;
      case WalletStatus.StillRequestingUnlock:
        return (
          <Button onClick={onConnectClick}>
            Connecting wallet - please unlock your wallet provider
          </Button>
        );
      default:
        break;
    }
  }, [loginStatus, onConnectClick, onLoginWithWallet, walletStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (
          loginStatus === LoginStatus.LoggedOut &&
          walletStatus === WalletStatus.Unlocked
        ) {
          const isRegistered = await getIsWalletIdRegistered();
          if (!cancelled) {
            setWalletRegistered(isRegistered);
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (reason: any) {
        if (!cancelled) {
          setShowError(reason);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIsWalletIdRegistered, loginStatus, walletStatus]);
  return (
    <div>
      {!walletRegistered && registerButton}
      {walletRegistered && signInButton}
    </div>
  );
};
