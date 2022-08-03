import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  LoginStatus,
  WalletStatus,
  useMatrixStore,
  useWeb3Context,
  useZionClient,
} from "use-zion-client";
import { LoginButton } from "./LoginButton/LoginButton";
import { ButtonTooltip } from "./LoginButton/Tooltip/ButtonTooltip";

export enum ButtonStatus {
  ConnectRequired = "wallet.connect",
  ConnectError = "wallet.connect.error",
  ConnectProgress = "wallet.connect.progress",
  ConnectSuccess = "wallet.connect.success",
  ConnectUnlock = "wallet.unlock.unlock",
  ConnectUnlockTimeout = "wallet.unlock.timeout",
  Login = "login.required",
  LoginProgress = "login.progress",
  LoginSuccess = "login.sucess",
  Register = "signup.Register",
}

const loginMsgToSign = `Click to sign in and accept the Harmony Terms of Service.`;
export const registerWalletMsgToSign = `Click to register and accept the Harmony Terms of Service.`;
const REDIRECT_SIGNUP = true;

export const LoginComponent = () => {
  const navigate = useNavigate();
  const { loginStatus, loginError } = useMatrixStore();
  const { loginWithWallet, registerWallet } = useZionClient();
  const { requestAccounts, walletStatus } = useWeb3Context();

  const handleConnect = useCallback(() => {
    requestAccounts();
  }, [requestAccounts]);

  const handleLogin = useCallback(() => {
    loginWithWallet(loginMsgToSign);
  }, [loginWithWallet]);

  const handleRegister = useCallback(() => {
    if (REDIRECT_SIGNUP) {
      navigate("/register");
    } else {
      registerWallet(registerWalletMsgToSign);
    }
  }, [navigate, registerWallet]);

  // retrieve the connection and login status synchronously
  const _preliminaryStatus = getButtonStatus(walletStatus, loginStatus);
  // if newly connected but yet not logged in check further (async) if the address is registred
  const { registrationStatus } = useCheckRegistrationStatusWhen(
    _preliminaryStatus === ButtonStatus.ConnectSuccess,
  );
  // actual state of the button based on connection AND registration
  const status = registrationStatus ?? _preliminaryStatus;

  const buttonLabel = getButtonLabel(status);
  const tooltipMessage = getTooltipMessage(status);
  const isSpinning = getIsSpinning(status);
  const onButtonClick = useButtonClick(status, {
    handleConnect,
    handleLogin,
    handleRegister,
  });

  return (
    <ButtonTooltip message={loginError ? loginError.message : tooltipMessage}>
      <LoginButton
        label={buttonLabel}
        loading={isSpinning}
        onClick={onButtonClick}
      />
    </ButtonTooltip>
  );
};

const useButtonClick = (
  status: ButtonStatus,
  actions: {
    handleConnect: () => void;
    handleLogin: () => void;
    handleRegister: () => void;
  },
) => {
  const { handleConnect, handleLogin, handleRegister } = actions;

  return useCallback(() => {
    switch (status) {
      case ButtonStatus.ConnectRequired:
      case ButtonStatus.ConnectError:
        return handleConnect();
      case ButtonStatus.Login:
        return handleLogin();
      case ButtonStatus.Register:
        return handleRegister();
    }
  }, [handleConnect, handleLogin, handleRegister, status]);
};

const getButtonLabel = (status: ButtonStatus) => {
  switch (status) {
    default:
      return "Connect";
    case ButtonStatus.ConnectRequired:
    case ButtonStatus.ConnectError:
      return "Connect";
    case ButtonStatus.Login:
    case ButtonStatus.LoginProgress:
      return "Login";
    case ButtonStatus.Register:
      return "Register";
  }
};

const getTooltipMessage = (status: ButtonStatus) => {
  switch (status) {
    case ButtonStatus.ConnectUnlock:
    case ButtonStatus.ConnectUnlockTimeout:
      return "please unlock your wallet before proceeding";
    case ButtonStatus.ConnectRequired:
      return "";
    case ButtonStatus.ConnectError:
      return "something went wrong, please make sure your wallet is unlocked";
    case ButtonStatus.Login:
    case ButtonStatus.LoginProgress:
      return "click to login in with your wallet";
    case ButtonStatus.Register:
      return "register a new account";
    default:
      return "";
  }
};

const getIsSpinning = (status: ButtonStatus) => {
  return [
    ButtonStatus.ConnectUnlock,
    ButtonStatus.ConnectUnlockTimeout,
    ButtonStatus.ConnectProgress,
    ButtonStatus.LoginProgress,
  ].includes(status);
};

const getButtonStatus = (
  walletStatus: WalletStatus,
  loginStatus: LoginStatus,
) => {
  switch (walletStatus) {
    default:
    case WalletStatus.Unknown: {
      return ButtonStatus.ConnectRequired;
    }
    case WalletStatus.Error: {
      return ButtonStatus.ConnectError;
    }
    case WalletStatus.Unlocked: {
      if (loginStatus === LoginStatus.LoggingIn) {
        return ButtonStatus.LoginProgress;
      } else if (loginStatus === LoginStatus.LoggedOut) {
        return ButtonStatus.ConnectSuccess;
      } else {
        return ButtonStatus.LoginSuccess;
      }
    }
    case WalletStatus.RequestUnlock: {
      return ButtonStatus.ConnectUnlock;
    }
    case WalletStatus.StillRequestingUnlock: {
      return ButtonStatus.ConnectUnlockTimeout;
    }
  }
};

/**
 * async registration check fired once the wallet is unlocked
 **/
export const useCheckRegistrationStatusWhen = (needsCheck: boolean) => {
  const { getIsWalletIdRegistered } = useZionClient();
  const [registrationStatus, setRegistrationStatus] = useState<ButtonStatus>();

  useEffect(() => {
    let cancelled = false;
    if (!needsCheck) {
      // skip if not in a position to check if the wallet is registered
      setRegistrationStatus(undefined);
    } else {
      // async registration check
      (async () => {
        try {
          const isRegistered = await getIsWalletIdRegistered();
          if (isRegistered) {
            setRegistrationStatus(ButtonStatus.Login);
          } else {
            setRegistrationStatus(ButtonStatus.Register);
          }
        } catch (reason: unknown) {
          if (!cancelled) console.warn(reason);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [getIsWalletIdRegistered, needsCheck]);

  return { registrationStatus };
};
