/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { useMatrixStore } from "../../src/store/use-matrix-store";
import { useZionClient } from "../../src/hooks/use-zion-client";
import { LoginStatus } from "../../src/hooks/login";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ZionTestApp } from "./helpers/ZionTestApp";
import { ZionTestWeb3Provider } from "./helpers/ZionTestWeb3Provider";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("useRegisterPasswordUserHooks", () => {
  test("username / password registration", async () => {
    const bobProvider = new ZionTestWeb3Provider();
    const bobId = bobProvider.wallet.address;
    // create a veiw for the wallet
    const RegisterUsernamePasswordComponent = () => {
      const { loginStatus, loginError } = useMatrixStore();
      const { registerPasswordUser } = useZionClient();
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
      <ZionTestApp provider={bobProvider}>
        <RegisterUsernamePasswordComponent />
      </ZionTestApp>,
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
