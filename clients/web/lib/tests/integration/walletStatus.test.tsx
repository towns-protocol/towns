/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { generateTestingUtils } from "eth-testing";
import { ethers } from "ethers";
import { useWeb3Context, WalletStatus } from "../../src/hooks/use-web3";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useMatrixClient } from "../../src/hooks/use-matrix-client";
import { LoginStatus } from "../../src/hooks/login";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixTestApp } from "./helpers/MatrixTestApp";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("walletStatus", () => {
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
  });
  afterEach(() => {
    // Clear all mocks between tests
    testingUtils.clearAllMocks();
  });
  test("new user registers a new wallet and is logged in", async () => {
    // create a wallet for bob
    const bobWallet = ethers.Wallet.createRandom();
    // create a veiw for the wallet
    const TestWalletStatus = () => {
      const { walletStatus, chainId } = useWeb3Context();
      const { loginStatus, loginError } = useMatrixStore();
      const { registerWallet } = useMatrixClient();
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
      <MatrixTestApp testingUtils={testingUtils} wallet={bobWallet}>
        <TestWalletStatus />
      </MatrixTestApp>,
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
