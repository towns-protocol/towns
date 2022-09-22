import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256 } from "ethers/lib/utils";
import MerkleTree from "merkletreejs";

enum Allowances {
  waitlist,
  allowlist,
}

function hashToken(address: any, allowance: any) {
  return Buffer.from(
    ethers.utils
      .solidityKeccak256(["address", "uint256"], [address, allowance])
      .slice(2),
    "hex"
  );
}

function createMerkle(allowlist: {}) {
  const leaves = Object.entries(allowlist).map((token) => hashToken(...token));
  const merkle = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return merkle;
}

describe("CouncilNFT", () => {
  async function deployNFT() {
    const [
      owner,
      allowlist1,
      allowlist2,
      waitlist1,
      waitlist2,
      waitlist3,
      nolist1,
    ] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("CouncilNFT");

    const merkle = await createMerkle({
      [allowlist1.address]: Allowances.allowlist,
      [allowlist2.address]: Allowances.allowlist,
      [waitlist1.address]: Allowances.waitlist,
      [waitlist2.address]: Allowances.waitlist,
      [waitlist3.address]: Allowances.waitlist,
    });

    const nft = await NFT.deploy(
      "Zion",
      "ZION",
      "baseURI",
      merkle.getHexRoot()
    );

    return { nft, merkle, owner, allowlist1, waitlist1, nolist1 };
  }

  describe("Minting", () => {
    it("fails if public mint is not open", async () => {
      const { nft, nolist1 } = await loadFixture(deployNFT);

      await expect(nft.mint(nolist1.address)).to.be.revertedWith(
        "Public minting is not allowed yet"
      );
    });

    it(`mints if you're on the allow list`, async () => {
      const { nft, allowlist1, merkle } = await loadFixture(deployNFT);

      const leaf = hashToken(allowlist1.address, Allowances.allowlist);
      const proof = merkle.getHexProof(leaf);

      const root = merkle.getHexRoot();
      expect(merkle.verify(proof, leaf, root)).to.be.true;

      await nft.privateMint(allowlist1.address, Allowances.allowlist, proof, {
        value: ethers.utils.parseEther("0.08"),
      });

      expect(await nft.balanceOf(allowlist1.address)).to.equal("1");
      expect(await nft.ownerOf("1")).to.equal(allowlist1.address);
    });
  });
});
