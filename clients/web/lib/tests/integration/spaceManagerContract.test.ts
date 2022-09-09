/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { RoomVisibility } from "use-zion-client/src/types/matrix-types";
import { registerAndStartClients } from "use-zion-client/tests/integration/helpers/TestUtils";

describe("spaceManagerContract", () => {
  // usefull for debugging or running against cloud servers
  jest.setTimeout(30 * 1000);
  // test: spaceContract
  test("interact with the space contract", async () => {
    // create clients
    const { bob } = await registerAndStartClients(["bob"]);
    // put some money in bob's account
    await bob.fundWallet();
    // create a space
    const spaceName = bob.makeUniqueName();
    const tx = await bob.createWeb3Space({
      name: spaceName,
      visibility: RoomVisibility.Private,
    });
    // log our our transaction
    console.log("tx", tx);
    const receipt = await tx.wait();
    // log our our transaction
    console.log("receipt", receipt);
    // fetch the spaces
    const spaces = await bob.spaceManager.unsigned.getSpaces();
    // expect a lower case name for the space
    expect(
      spaces.find((s) => s.name === spaceName.toLowerCase()),
    ).toBeDefined();
  }); // end test
}); // end describe
