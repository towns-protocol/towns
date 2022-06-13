import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LoginStatus,
  WalletStatus,
  useMatrixClient,
  useMatrixStore,
  useWeb3Context,
} from "use-matrix-client";

import { Spinner } from "@components/Spinner";
import { Button, Paragraph, Stack } from "@ui";

const StatementToSign = `Click to sign in and accept the Harmony Terms of Service.`;

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

  const onLoginWithWallet = useCallback(() => {
    loginWithWallet(StatementToSign);
  }, [loginWithWallet]);

  const onRegisterNewWallet = useCallback(() => {
    registerWallet(StatementToSign);
  }, [registerWallet]);

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
          return <Spinner />;
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
            <Button icon="wallet" onClick={onConnectClick}>
              Connect Wallet
            </Button>
          </Stack>
        );
      case WalletStatus.Unknown:
        return <Button onClick={onConnectClick}>Connect Wallet</Button>;
      case WalletStatus.Unlocked:
        if (loginStatus === LoginStatus.LoggingIn) {
          return <Spinner />;
        } else if (loginStatus === LoginStatus.LoggedOut) {
          return <Button onClick={onLoginWithWallet}>Sign in</Button>;
        }
        break;
      case WalletStatus.RequestUnlock:
        return <Button onClick={onConnectClick}>Connecting wallet</Button>;
      case WalletStatus.StillRequestingUnlock:
        return (
          <Stack horizontal>
            <Paragraph truncate>
              Connecting wallet - please unlock your wallet provider
            </Paragraph>
            <Button onClick={onConnectClick}>Connect Wallet</Button>
          </Stack>
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
    <>
      {!walletRegistered && registerButton}
      {walletRegistered && signInButton}
    </>
  );
};
