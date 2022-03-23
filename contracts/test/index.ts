/* eslint-disable camelcase */
import { expect } from "chai";
import { upgrades, ethers } from "hardhat";

// eslint-disable-next-line camelcase
import {
  NodeManager,
  NodeManager__factory,
  NodeManagerUpgradeTest,
  NodeManagerUpgradeTest__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../../typechain-types/index";

/*
 This was an aborted attempt to compute the interface from the ABI, but it didn't match so
 the interfaceId's are hard coded below

import IAccessControlUpgradeable from "@openzeppelin/contracts-upgradeable/build/contracts/AccessControlUpgradeable.json";

const IAccessControlUpgradeableInterface = new ethers.utils.Interface(
  IAccessControlUpgradeable.abi
);

export function getInterfaceID(contractInterface: ethers.utils.Interface) {
  let interfaceID: ethers.BigNumber = ethers.constants.Zero;
  const functions: string[] = Object.keys(contractInterface.functions);
  for (let i = 0; i < functions.length; i++) {
    interfaceID = interfaceID.xor(contractInterface.getSighash(functions[i]));
  }

  return interfaceID;
}
*/

// eslint-disable-next-line camelcase
// type NodeManagerContract = Awaited<ReturnType<NodeManager__factory["deploy"]>>;
/*
type ContractState = Awaited<
  ReturnType<NodeManagerContract["getCurrentState"]>
>;
*/

const IERC1822ProxiableUpgradeable = "0x52d1902d";
const IAccessControlUpgradeable = "0x7965db0b";

describe("Test", function () {
  it("NodeManager Should deploy", async function () {
    const NodeManagerFactory = (await ethers.getContractFactory(
      "NodeManager"
    )) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
    })) as NodeManager;
    await nodeManager.deployed();
  });

  it("NodeManagerUpgradeTest deploys succesfully", async function () {
    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest"
    )) as NodeManagerUpgradeTest__factory;
    const nodeManagerUpgradeTest = (await upgrades.deployProxy(
      NodeManagerUpgradeTestFactory,
      [],
      {
        kind: "uups",
      }
    )) as NodeManagerUpgradeTest;
    await nodeManagerUpgradeTest.deployed();
    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  it("NodeManager upgrades to NodeManagerUpgradeTest succesfully", async function () {
    const NodeManagerFactory = (await ethers.getContractFactory(
      "NodeManager"
    )) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
    })) as NodeManager;
    await nodeManager.deployed();

    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest"
    )) as NodeManagerUpgradeTest__factory;

    await upgrades.upgradeProxy(
      nodeManager.address,
      NodeManagerUpgradeTestFactory,
      {
        kind: "uups",
      }
    );

    expect(await nodeManager.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  it("NodeManagerUpgradeTest reverts on downgrade to NodeManager", async function () {
    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest"
    )) as NodeManagerUpgradeTest__factory;
    const nodeManagerUpgradeTest = (await upgrades.deployProxy(
      NodeManagerUpgradeTestFactory,
      [],
      {
        kind: "uups",
      }
    )) as NodeManagerUpgradeTest;
    await nodeManagerUpgradeTest.deployed();
    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );

    const NodeManagerFactory = (await ethers.getContractFactory(
      "NodeManager"
    )) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
    })) as NodeManager;
    await nodeManager.deployed();

    await expect(
      upgrades.upgradeProxy(nodeManagerUpgradeTest.address, NodeManagerFactory)
    ).to.be.revertedWith("NO_DOWNGRADE");

    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  describe("Basic Functions", function () {
    let nodeManager: NodeManager;
    before(async function () {
      const NodeManagerFactory = (await ethers.getContractFactory(
        "NodeManager"
      )) as NodeManager__factory;
      nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
        kind: "uups",
      })) as NodeManager;
      await nodeManager.deployed();
    });
    it("NodeManager Should support IERC1822ProxiableUpgradeable", async function () {
      expect(
        await nodeManager.supportsInterface(IERC1822ProxiableUpgradeable)
      ).to.equal(true);
    });
    it("NodeManager Should support IAccessControlUpgradeable", async function () {
      expect(
        await nodeManager.supportsInterface(IAccessControlUpgradeable)
      ).to.equal(true);
    });
    it("NodeManager Should support NOT support NULL interface", async function () {
      expect(await nodeManager.supportsInterface("0x00000000")).to.equal(false);
    });

    it("NodeManager getContractVersion Should return contract Version", async function () {
      expect(await nodeManager.getContractVersion()).to.equal(1);
    });
    it("NodeManager test Should return Greetings", async function () {
      expect(await nodeManager.test()).to.equal("Greetings from NodeManager");
    });
  });
});
