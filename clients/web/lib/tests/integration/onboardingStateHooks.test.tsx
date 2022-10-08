/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from "react";
import { useZionClient } from "../../src/hooks/use-zion-client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ZionTestApp } from "./helpers/ZionTestApp";
import { RegisterWallet } from "./helpers/TestComponents";
import { ZionTestWeb3Provider } from "./helpers/ZionTestWeb3Provider";
import { useZionContext } from "../../src/components/ZionContextProvider";
import { useMyProfile } from "../../src/hooks/use-my-profile";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("onboardingStateHooks", () => {
  jest.setTimeout(30000);
  test("test that onboarding state reflects reality", async () => {
    // create a wallet for bob
    const aliceProvider = new ZionTestWeb3Provider();
    // create a veiw for bob
    const TestComponent = () => {
      const { setDisplayName, setAvatarUrl } = useZionClient();
      const { onboardingState } = useZionContext();
      const myProfile = useMyProfile();
      const [seenStates, setSeenStates] = useState<string[]>([]);
      useEffect(() => {
        setSeenStates((prev) => [...prev, onboardingState.kind]);
      }, [onboardingState]);

      const onClickSetDisplayName = useCallback(() => {
        void (async () => {
          await setDisplayName("Bob's your uncle");
        })();
      }, [setDisplayName]);

      const onClickSetAvatarUrl = useCallback(() => {
        void (async () => {
          await setAvatarUrl("bob.png");
        })();
      }, [setAvatarUrl]);

      return (
        <>
          <RegisterWallet />
          <button onClick={onClickSetDisplayName}>Set Display Name</button>
          <button onClick={onClickSetAvatarUrl}>Set Avatar Url</button>
          <div data-testid="seenStates">{seenStates.join(",")}</div>
          <div data-testid="onboardingState">{toString(onboardingState)}</div>
          <div data-testid="myProfile">{toString(myProfile)}</div>
        </>
      );
    };
    // render it
    render(
      <ZionTestApp provider={aliceProvider}>
        <TestComponent />
      </ZionTestApp>,
    );
    // get our test elements
    const onboardingState = screen.getByTestId("onboardingState");
    const seenStates = screen.getByTestId("seenStates");
    const setDisplayName = screen.getByRole("button", {
      name: "Set Display Name",
    });
    const setAvatarUrl = screen.getByRole("button", {
      name: "Set Avatar Url",
    });
    // wait for client to be running
    await waitFor(() =>
      expect(seenStates).toHaveTextContent("none,loading,user-profile"),
    );
    // check needs display name and avatar
    await waitFor(() =>
      expect(onboardingState).toHaveTextContent("bNeedsDisplayName: true"),
    );
    await waitFor(() =>
      expect(onboardingState).toHaveTextContent("bNeedsAvatar: true"),
    );
    // have bob send a message to jane
    fireEvent.click(setDisplayName);
    // check needs avatar
    await waitFor(() =>
      expect(onboardingState).toHaveTextContent("bNeedsDisplayName: false"),
    );
    // full state hasn't updated, we retrigger user-profile but with different params
    await waitFor(() =>
      expect(seenStates).toHaveTextContent("user-profile,user-profile"),
    );
    // set avatar
    fireEvent.click(setAvatarUrl);
    // and all states have been seen
    await waitFor(() => expect(seenStates).toHaveTextContent("done"));
  }); // end test with bob
}); // end describe

export function toString(state?: any) {
  if (!state) {
    return "undefined";
  }
  return (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.entries(state)
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")
  );
}
