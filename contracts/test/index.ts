/* eslint-disable camelcase */
import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { upgrades, ethers } from "hardhat";

// eslint-disable-next-line camelcase
import {
  NodeManager,
  NodeManager__factory,
  NodeManagerUpgradeTest,
  NodeManagerUpgradeTest__factory,
  FQDNRegex__factory,
  FQDNRegex,
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

describe("Tests", function () {
  describe("FQDNRegex Tests", function () {
    // Testing "([a-zA-Z0-9-]+\\.)+[a-zA-Z][a-zA-Z]+";
    let fqdnRegex: FQDNRegex;
    before(async function () {
      const FQDNRegexFactory = (await ethers.getContractFactory(
        "FQDNRegex"
      )) as FQDNRegex__factory;
      fqdnRegex = (await FQDNRegexFactory.deploy()) as FQDNRegex;
      await fqdnRegex.deployed();
    });
    it("FQDNRegex matches", async function () {
      expect(await fqdnRegex.matches("911.gov")).to.equal(true);
      expect(await fqdnRegex.matches("a.com")).to.equal(true);
      expect(await fqdnRegex.matches("A.com")).to.equal(true);
      expect(await fqdnRegex.matches("1.com")).to.equal(true);
      expect(await fqdnRegex.matches("-.com")).to.equal(true);
      expect(await fqdnRegex.matches("a-.com")).to.equal(true);
      expect(await fqdnRegex.matches("-a.com")).to.equal(true);
      expect(await fqdnRegex.matches("a.com")).to.equal(true);
      expect(await fqdnRegex.matches("a.b.com")).to.equal(true);
      expect(await fqdnRegex.matches("A.COM")).to.equal(true);
      expect(await fqdnRegex.matches("9a.gov")).to.equal(true);
      expect(await fqdnRegex.matches("aa-.com")).to.equal(true);
      expect(await fqdnRegex.matches("-aa.com")).to.equal(true);
      expect(await fqdnRegex.matches("aaa.com")).to.equal(true);
      expect(await fqdnRegex.matches("aaa.bbb.com")).to.equal(true);
      expect(await fqdnRegex.matches("A.B.COM")).to.equal(true);
      expect(
        await fqdnRegex.matches("typical-hostname33.whatever.co.uk")
      ).to.equal(true);

      expect(await fqdnRegex.matches("a")).to.equal(false);
      expect(await fqdnRegex.matches("aa")).to.equal(false);
      expect(await fqdnRegex.matches("911")).to.equal(false);
      expect(await fqdnRegex.matches("a.911")).to.equal(false);
      expect(await fqdnRegex.matches("my_host.com")).to.equal(false);
      expect(await fqdnRegex.matches("a.a8a")).to.equal(false);
      expect(await fqdnRegex.matches("a.a")).to.equal(false);
      expect(await fqdnRegex.matches("a.7")).to.equal(false);
      expect(await fqdnRegex.matches("a.7a")).to.equal(false);
      expect(await fqdnRegex.matches("a.a7")).to.equal(false);
      expect(await fqdnRegex.matches(".")).to.equal(false);
      expect(await fqdnRegex.matches(".com")).to.equal(false);
      expect(await fqdnRegex.matches(".a.com")).to.equal(false);
      expect(await fqdnRegex.matches("a.com.")).to.equal(false);
      expect(await fqdnRegex.matches("a..com")).to.equal(false);
      expect(await fqdnRegex.matches("A.C")).to.equal(false);
      expect(await fqdnRegex.matches("&.COM")).to.equal(false);
      expect(await fqdnRegex.matches("ab.&")).to.equal(false);
      expect(await fqdnRegex.matches("[].com")).to.equal(false);
      expect(await fqdnRegex.matches("abc[].com")).to.equal(false);
      expect(await fqdnRegex.matches("[]abc.com")).to.equal(false);
      expect(await fqdnRegex.matches("abc.com[]")).to.equal(false);
      expect(await fqdnRegex.matches("abc.[]com")).to.equal(false);
      expect(await fqdnRegex.matches("{}.com")).to.equal(false);
      expect(await fqdnRegex.matches("abc{}.com")).to.equal(false);
      expect(await fqdnRegex.matches("{}abc.com")).to.equal(false);
      expect(await fqdnRegex.matches("abc.com{}")).to.equal(false);
      expect(await fqdnRegex.matches("abc.{}com")).to.equal(false);
    });
  });

  let fqdnRegex: FQDNRegex;
  before(async function () {
    const FQDNRegexFactory = (await ethers.getContractFactory(
      "FQDNRegex"
    )) as FQDNRegex__factory;
    fqdnRegex = (await FQDNRegexFactory.deploy()) as FQDNRegex;
    await fqdnRegex.deployed();
  });

  it("NodeManager Should deploy", async function () {
    const NodeManagerFactory = (await ethers.getContractFactory("NodeManager", {
      libraries: {
        FQDNRegex: fqdnRegex.address,
      },
    })) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
      unsafeAllow: ["external-library-linking"],
    })) as NodeManager;
    await nodeManager.deployed();
  });

  it("NodeManagerUpgradeTest deploys succesfully", async function () {
    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest",
      {
        libraries: {
          FQDNRegex: fqdnRegex.address,
        },
      }
    )) as NodeManagerUpgradeTest__factory;
    const nodeManagerUpgradeTest = (await upgrades.deployProxy(
      NodeManagerUpgradeTestFactory,
      [],
      {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      }
    )) as NodeManagerUpgradeTest;
    await nodeManagerUpgradeTest.deployed();
    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  it("NodeManager upgrades to NodeManagerUpgradeTest succesfully", async function () {
    const NodeManagerFactory = (await ethers.getContractFactory("NodeManager", {
      libraries: {
        FQDNRegex: fqdnRegex.address,
      },
    })) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
      unsafeAllow: ["external-library-linking"],
    })) as NodeManager;
    await nodeManager.deployed();

    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest",
      {
        libraries: {
          FQDNRegex: fqdnRegex.address,
        },
      }
    )) as NodeManagerUpgradeTest__factory;

    await upgrades.upgradeProxy(
      nodeManager.address,
      NodeManagerUpgradeTestFactory,
      {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      }
    );

    expect(await nodeManager.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  it("NodeManagerUpgradeTest reverts on downgrade to NodeManager", async function () {
    const NodeManagerUpgradeTestFactory = (await ethers.getContractFactory(
      "NodeManagerUpgradeTest",
      {
        libraries: {
          FQDNRegex: fqdnRegex.address,
        },
      }
    )) as NodeManagerUpgradeTest__factory;
    const nodeManagerUpgradeTest = (await upgrades.deployProxy(
      NodeManagerUpgradeTestFactory,
      [],
      {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
      }
    )) as NodeManagerUpgradeTest;
    await nodeManagerUpgradeTest.deployed();
    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );

    const NodeManagerFactory = (await ethers.getContractFactory("NodeManager", {
      libraries: {
        FQDNRegex: fqdnRegex.address,
      },
    })) as NodeManager__factory;
    const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
      kind: "uups",
      unsafeAllow: ["external-library-linking"],
    })) as NodeManager;
    await nodeManager.deployed();

    await expect(
      upgrades.upgradeProxy(
        nodeManagerUpgradeTest.address,
        NodeManagerFactory,
        {
          kind: "uups",
          unsafeAllow: ["external-library-linking"],
        }
      )
    ).to.be.revertedWith("Downgrade not allowed");

    expect(await nodeManagerUpgradeTest.test()).to.equal(
      "Greetings from NodeManagerUpgradeTest"
    );
  });

  describe("Basic Functions", function () {
    let nodeManager: NodeManager;
    before(async function () {
      const NodeManagerFactory = (await ethers.getContractFactory(
        "NodeManager",
        {
          libraries: {
            FQDNRegex: fqdnRegex.address,
          },
        }
      )) as NodeManager__factory;
      nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
        kind: "uups",
        unsafeAllow: ["external-library-linking"],
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
    it("NodeManager rejects new a new node without a stake", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      await expect(
        nodeManager.registerNode(nodeHash, nodeFqdn)
      ).to.be.revertedWith("Must transfer at least NODE_STAKE");
      expect(nodeManager.nodes.length === 0);
      const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
      expect(nodeRecord.fqdn).to.eq("");
      expect(nodeRecord.state).to.eq(0);
    });
    it("NodeManager accepts new a new node with a stake", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      expect(await nodeManager.registerNode(nodeHash, nodeFqdn, overrides));
      const nodes = await nodeManager.nodes(0);
      expect(nodes.eq(nodeHash));
      const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
      expect(nodeRecord.fqdn).to.eq(nodeFqdn);
      expect(nodeRecord.nodeHash).to.eq(nodeHash);
      expect(nodeRecord.state).to.eq(0);
    });
    it("NodeManager rejects a duplicate node", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.test";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      expect(await nodeManager.registerNode(nodeHash, nodeFqdn, overrides));
      expect(nodeManager.nodes.length === 1);
      const nodes = await nodeManager.nodes(0);
      expect(nodes.eq(nodeHash));
      const nodeRecord = await nodeManager.nodeHashToNode(nodeHash);
      expect(nodeRecord.fqdn).to.eq(nodeFqdn);
      expect(nodeRecord.nodeHash).to.eq(nodeHash);
      expect(nodeRecord.state).to.eq(0);
      await expect(
        nodeManager.registerNode(nodeHash, nodeFqdn, overrides)
      ).to.be.revertedWith("Duplicate nodeHash");
      expect(nodeManager.nodes.length === 1);
    });
    it("NodeManager rejects an invalid fqdn", async function () {
      const nodeHash = BigNumber.from(utils.randomBytes(32));
      const nodeFqdn = "node1.11";
      const overrides = {
        value: ethers.utils.parseEther("10"),
      };
      await expect(
        nodeManager.registerNode(nodeHash, nodeFqdn, overrides)
      ).to.be.revertedWith("fqdn must match regex");
      expect(nodeManager.nodes.length === 1);
    });
  });
});
