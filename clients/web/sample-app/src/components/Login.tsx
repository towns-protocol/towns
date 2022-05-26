import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Theme,
  Typography,
} from "@mui/material";
import {
  LoginStatus,
  WalletStatus,
  useMatrixClient,
  useMatrixStore,
  useWeb3Context,
  getShortUsername,
} from "use-matrix-client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { makeStyles } from "@mui/styles";

const StatementToSign = `Click to sign in and accept the Harmony Terms of Service: https://harmony.xyz/tos.

This request will not trigger a blockchain transaction or cost any gas fees.

Your authentication status will reset after 24 hours.`;

export function Login(): JSX.Element {
  const styles = useStyles();
  const [showError, setShowError] = useState<string | undefined>(undefined);
  const { getIsWalletIdRegistered, loginWithWallet, registerWallet } =
    useMatrixClient();
  const { loginStatus, loginError } = useMatrixStore();
  const { accounts, chainId, requestAccounts, walletStatus } = useWeb3Context();
  const [walletRegistered, setWalletRegistered] = useState<boolean>(true);

  const myWalletAddress = useMemo(() => {
    if (accounts && accounts.length > 0) {
      return getShortUsername(accounts[0]);
    }
  }, [accounts]);

  const onConnectClick = useCallback(() => {
    switch (walletStatus) {
      case WalletStatus.Error:
      case WalletStatus.Unknown:
        requestAccounts();
        break;
      case WalletStatus.RequestUnlock:
        setShowError("Connecting wallet");
        break;
      case WalletStatus.StillRequestingUnlock:
        setShowError("Connecting wallet - please unlock your wallet provider");
        break;
      default:
        break;
    }
  }, [requestAccounts, walletStatus]);

  const onLoginWithWallet = useCallback(
    async function () {
      loginWithWallet(StatementToSign);
    },
    [loginWithWallet],
  );

  const onRegisterNewWallet = useCallback(
    async function () {
      registerWallet(StatementToSign);
    },
    [registerWallet],
  );

  const onCloseAlert = useCallback(function () {
    setShowError(undefined);
  }, []);

  useEffect(() => {
    if (loginError?.message) {
      setShowError(loginError.message);
    } else {
      setShowError("");
    }
  }, [loginError]);

  const registerButton = useMemo(() => {
    switch (walletStatus) {
      case WalletStatus.Unlocked:
        if (loginStatus === LoginStatus.Registering) {
          return <CircularProgress size={56} />;
        } else if (loginStatus === LoginStatus.LoggedOut) {
          return (
            <Button
              variant="contained"
              color="primary"
              sx={{ margin: "10px" }}
              onClick={onRegisterNewWallet}
            >
              Register new wallet
            </Button>
          );
        }
        break;
      default:
        break;
    }
  }, [loginStatus, onRegisterNewWallet, walletStatus]);

  const signInButton = useMemo(() => {
    switch (walletStatus) {
      case WalletStatus.Error:
      case WalletStatus.Unknown:
        return (
          <Button
            variant="contained"
            color="primary"
            sx={{ margin: "10px" }}
            onClick={onConnectClick}
          >
            Connect Wallet
          </Button>
        );
      case WalletStatus.Unlocked:
        if (loginStatus === LoginStatus.LoggingIn) {
          return <CircularProgress size={56} />;
        } else if (loginStatus === LoginStatus.LoggedOut) {
          return (
            <Button
              variant="contained"
              color="primary"
              sx={{ margin: "10px" }}
              onClick={onLoginWithWallet}
            >
              Sign in with wallet
            </Button>
          );
        }
        break;
      case WalletStatus.RequestUnlock:
        return (
          <Button
            variant="contained"
            color="primary"
            sx={{ margin: "10px" }}
            onClick={onConnectClick}
          >
            Connecting wallet
          </Button>
        );
      case WalletStatus.StillRequestingUnlock:
        return (
          <Button
            variant="contained"
            color="primary"
            sx={{ margin: "10px" }}
            onClick={onConnectClick}
          >
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
    <div className={styles.container}>
      <Box sx={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)" }}>
        <Box sx={{ display: "grid", marginTop: "5px", alignItems: "Center" }}>
          <Typography variant="h6" component="span">
            Wallet status: {walletStatus}, Chain Id: {chainId}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", marginTop: "10px", alignItems: "Center" }}>
          <Typography variant="h6" component="span">
            Wallet: {myWalletAddress}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(1, 1fr)",
            margin: "10px",
            alignItems: "Center",
          }}
        >
          {!walletRegistered && registerButton}
          {walletRegistered && signInButton}
        </Box>
      </Box>
      <Snackbar
        open={showError ? true : false}
        autoHideDuration={5000}
        onClose={onCloseAlert}
      >
        <Alert onClose={onCloseAlert} severity="error">
          {showError}
        </Alert>
      </Snackbar>
    </div>
  );
}

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    backgroundColor: theme.palette.common.white,
    borderRadius: "25px",
    padding: theme.spacing(8),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));
