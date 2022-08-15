/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { useWeb3Context, WalletStatus } from "../../src/hooks/use-web3";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useZionClient } from "../../src/hooks/use-zion-client";
import { LoginStatus } from "../../src/hooks/login";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ZionTestApp } from "./helpers/ZionTestApp";
import { ZionTestWeb3Provider } from "./helpers/ZionTestWeb3Provider";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("walletStatusHooks", () => {
  test("new user registers a new wallet and is logged in", async () => {
    // create a provider for bob
    const bobProvider = new ZionTestWeb3Provider();
    // create a veiw for the wallet
    const TestWalletStatus = () => {
      const { walletStatus, chainId } = useWeb3Context();
      const { loginStatus, loginError } = useMatrixStore();
      const { registerWallet } = useZionClient();
      return (
        <>
          <div data-testid="walletStatus">{walletStatus}</div>
          <div data-testid="chainId">{chainId}</div>
          <div data-testid="loginStatus">{loginStatus}</div>
          <div data-testid="loginError">{loginError?.message ?? ""}</div>
          <button onClick={() => void registerWallet("...register?")}>
            Register
          </button>
        </>
      );
    };
    // render it
    render(
      <ZionTestApp provider={bobProvider}>
        <TestWalletStatus />
      </ZionTestApp>,
    );
    // get our test elements
    const walletStatus = screen.getByTestId("walletStatus");
    const loginStatus = screen.getByTestId("loginStatus");
    const loginError = screen.getByTestId("loginError");
    const registerButton = screen.getByRole("button", { name: "Register" });
    // wait for our wallet to get unlocked
    await waitFor(() =>
      expect(walletStatus).toHaveTextContent(WalletStatus.Unlocked),
    );
    // verify that we are logged out without error
    expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut);
    expect(loginError).toHaveTextContent("");
    // click the register button
    fireEvent.click(registerButton);
    // expect our status to change to logged in
    await waitFor(
      () => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn),
      { timeout: 5000 },
    );
  });
});
