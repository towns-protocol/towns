/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { generateTestingUtils } from "eth-testing";
import { ethers } from "ethers";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useMatrixClient } from "../../src/hooks/use-matrix-client";
import { LoginStatus } from "../../src/hooks/login";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixTestApp } from "./helpers/MatrixTestApp";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("useTegisterPasswordUser", () => {
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
  test("username / password registration", async () => {
    const bobWallet = ethers.Wallet.createRandom();
    const bobId = bobWallet.address;
    // create a veiw for the wallet
    const RegisterUsernamePasswordComponent = () => {
      const { loginStatus, loginError } = useMatrixStore();
      const { registerPasswordUser } = useMatrixClient();
      return (
        <>
          <div data-testid="loginStatus">{loginStatus}</div>
          <div data-testid="loginError">{loginError?.message ?? ""}</div>
          <button onClick={() => void registerPasswordUser(bobId, "password1")}>
            Register
          </button>
        </>
      );
    };
    // render it
    render(
      <MatrixTestApp testingUtils={testingUtils} wallet={bobWallet}>
        <RegisterUsernamePasswordComponent />
      </MatrixTestApp>,
    );
    // get our test elements
    const loginStatus = screen.getByTestId("loginStatus");
    const loginError = screen.getByTestId("loginError");
    const registerButton = screen.getByRole("button", { name: "Register" });
    // verify that we are logged out without error
    expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut);
    expect(loginError).toHaveTextContent("");
    // click the register button
    fireEvent.click(registerButton);
    // expect our status to change to logged in
    await waitFor(() =>
      expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn),
    );
  });
});
