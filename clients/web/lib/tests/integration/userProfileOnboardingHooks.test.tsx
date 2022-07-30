/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { generateTestingUtils } from "eth-testing";
import { render, screen, waitFor } from "@testing-library/react";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixTestApp } from "./helpers/MatrixTestApp";
import { useMyProfile } from "../../src/hooks/use-my-profile";
import { registerAndStartClients } from "./helpers/TestUtils";
import { LoginWithWallet, RegisterWallet } from "./helpers/TestComponents";
import { ethers } from "ethers";
import { LoginStatus } from "../../src/hooks/login";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("userProfileOnboardingHooks", () => {
  jest.setTimeout(10000);
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
  /// make sure that we load a user profile on launch
  test("user sees own non-null profile on first launch", async () => {
    // create wallet
    const aliceWallet = ethers.Wallet.createRandom();
    // create a veiw for alice
    const TestUserProfileOnLaunch = () => {
      const myProfile = useMyProfile();
      return (
        <>
          <RegisterWallet />
          <div data-testid="myProfileName">
            {myProfile?.displayName ?? "unknown"}
          </div>
        </>
      );
    };
    // render it
    render(
      <MatrixTestApp testingUtils={testingUtils} wallet={aliceWallet}>
        <TestUserProfileOnLaunch />
      </MatrixTestApp>,
    );
    // get our test elements
    const myProfileName = screen.getByTestId("myProfileName");
    const loginStatus = screen.getByTestId("loginStatus");
    await waitFor(() =>
      expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn),
    );
    // verify alice userid is rendering
    await waitFor(() =>
      expect(myProfileName).toHaveTextContent(
        "eip155=3a4=3a" + aliceWallet.address.toLowerCase(),
      ),
    );
  }); // end test
}); // end describe
