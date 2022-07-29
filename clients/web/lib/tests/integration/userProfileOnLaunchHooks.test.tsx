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
import { LoginWithWallet } from "./helpers/TestComponents";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("userProfileHooks", () => {
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
  test("user sees own info on launch", async () => {
    // create clients
    const { alice } = await registerAndStartClients(["alice"]);
    // save off the wallet
    const aliceWallet = alice.wallet;
    // set display name and avatar
    await alice.client.setDisplayName("Alice's your aunt");
    await alice.client.setAvatarUrl("alice.png");
    // stop alice
    alice.stopClient();
    // create a veiw for bob
    const TestUserProfileOnLaunch = () => {
      const myProfile = useMyProfile();
      return (
        <>
          <LoginWithWallet />
          <div data-testid="myProfileName">
            {myProfile?.displayName ?? "unknown"}
          </div>
          <div data-testid="myProfileAvatar">
            {myProfile?.avatarUrl ?? "unknown"}
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
    const myProfileAvatar = screen.getByTestId("myProfileAvatar");
    // verify alice name is rendering
    await waitFor(() =>
      expect(myProfileName).toHaveTextContent("Alice's your aunt"),
    );
    // verify alice avatar is rendering
    await waitFor(() => expect(myProfileAvatar).toHaveTextContent("alice.png"));
  }); // end test
}); // end describe
