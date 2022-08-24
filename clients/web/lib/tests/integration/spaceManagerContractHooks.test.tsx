/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ZionTestApp } from "use-zion-client/tests/integration/helpers/ZionTestApp";
import { RegisterWallet } from "use-zion-client/tests/integration/helpers/TestComponents";
import { useZionClient } from "use-zion-client/src/hooks/use-zion-client";
import { useSpacesFromContract } from "use-zion-client/src/hooks/use-spaces";
import { makeUniqueName } from "use-zion-client/tests/integration/helpers/TestUtils";
import { RoomVisibility } from "use-zion-client/src/types/matrix-types";
import { ZionTestWeb3Provider } from "use-zion-client/tests/integration/helpers/ZionTestWeb3Provider";

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe("spaceManagerContractHooks", () => {
  jest.setTimeout(10000);
  test("user can create and list web3 spaces", async () => {
    const provider = new ZionTestWeb3Provider();
    // add funds
    await provider.fundWallet();
    // create a unique space name for this test
    const spaceName = makeUniqueName("alice");
    // create a veiw for alice
    const TestComponent = () => {
      const { createWeb3Space } = useZionClient();
      // spaces
      const spaces = useSpacesFromContract();
      // callback to create a space
      const onClickCreateSpace = useCallback(async () => {
        void createWeb3Space({
          name: spaceName,
          visibility: RoomVisibility.Public,
        });
      }, [createWeb3Space]);
      // the view
      return (
        <>
          <RegisterWallet />
          <button onClick={onClickCreateSpace}>Create Space</button>
          <div data-testid="spaces">
            {spaces.map((element) => (
              <div key={element.key}>{element.name}</div>
            ))}
          </div>
        </>
      );
    };
    // render it
    render(
      <ZionTestApp provider={provider}>
        <TestComponent />
      </ZionTestApp>,
    );
    // get our test elements
    const clientRunning = screen.getByTestId("clientRunning");
    const createSpaceButton = screen.getByRole("button", {
      name: "Create Space",
    });
    // verify alice name is rendering
    await waitFor(() => expect(clientRunning).toHaveTextContent("true"));
    // click the button
    fireEvent.click(createSpaceButton);
    // did we make a space?
    await waitFor(() =>
      expect(screen.getByTestId("spaces")).toHaveTextContent(spaceName),
    );
  }); // end test
}); // end describe
