import { Alert, Box, Button, Snackbar, Theme, Typography } from "@mui/material";
import { LoginStatus, WalletStatus, useMatrixClient, useMatrixStore, useWeb3Context } from "use-matrix-client";
import { useCallback, useMemo, useState } from "react";

import { makeStyles } from "@mui/styles";

const StatementToSign = `Click to sign in and accept the Harmony Terms of Service: https://harmony.xyz/tos. This request will not trigger a blockchain transaction or cost any gas fees. Your authentication status will reset after 24 hours.`;

export function Login(): JSX.Element {
  const styles = useStyles();
  const [showError, setShowError] = useState<string | undefined>(undefined);
  const { loginWithWallet } = useMatrixClient();
  const { loginStatus } = useMatrixStore();
  const { accounts, chainId, requestAccounts, walletStatus } = useWeb3Context();

  const myWalletAddress = useMemo(() => {
    if (accounts && accounts.length > 0) {
      const last4 = accounts[0].length - 4;
      return `${accounts[0].slice(0, 5)}....${accounts[0].slice(last4)}`;
    }
    return undefined;
  }, [accounts]);

  const onConnectClick = useCallback(() => requestAccounts(), [requestAccounts]);

  const onLoginWithWallet = useCallback(async function () {
    const result = await loginWithWallet(StatementToSign);
    if (result.isAuthenticated) {
      console.log(`Account ${myWalletAddress} logged in`);
    } else {
      setShowError(result.error);
    }
  }, [loginWithWallet, myWalletAddress]);

  const onCloseAlert = useCallback(function () {
    setShowError(undefined);
  }, []);

  const signInButton = useMemo(() => {
    switch (walletStatus) {
      case WalletStatus.Error:
      case WalletStatus.Unknown:
        return (
          <Button variant="contained" color="primary" sx={{ margin: "10px"}} onClick={onConnectClick}>
            Connect Wallet
          </Button>
        );
      case WalletStatus.Unlocked:
        if (loginStatus === LoginStatus.LoggingIn) {
          return (
            <Button variant="contained" color="primary" sx={{ margin: "10px"}}>
              Signining in with wallet
            </Button>
          );  
        } else {
          return (
            <Button variant="contained" color="primary" sx={{ margin: "10px"}} onClick={onLoginWithWallet}>
              Sign in with wallet
            </Button>
          );  
        }
      case WalletStatus.RequestUnlock:
        return (
          <Button variant="contained" color="primary" sx={{ margin: "10px"}} onClick={onLoginWithWallet}>
            Connecting wallet
          </Button>
        );
      case WalletStatus.StillRequestingUnlock:
          return (
            <Button variant="contained" color="primary" sx={{ margin: "10px"}} onClick={onLoginWithWallet}>
              Connecting wallet - please unlock your wallet provider
            </Button>
          );
      default:
        break;
    }
  }, [loginStatus, onConnectClick, onLoginWithWallet, walletStatus]);

  return (
    <div className={styles.container}>
      <Box sx={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", marginTop: "5px", alignItems: "Center" }}>
          <Typography variant="h6" component="span">
            Wallet status: {walletStatus}, Chain Id: {chainId}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", marginTop: "10px", alignItems: "Center" }}>
          <Typography variant="h6" component="span">
            Wallet: {myWalletAddress}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", margin: "10px", alignItems: "Center" }}>
          {signInButton}
        </Box>
      </Box>
      <Snackbar
        open={showError ? true : false}
        autoHideDuration={5000}
        onClose={onCloseAlert}>
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
