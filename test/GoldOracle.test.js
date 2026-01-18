const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoldOracle", function () {
  let goldOracle;
  let owner;
  let addr1;
  let addr2;

  // Sample price data (8 decimals)
  const SAMPLE_PRICES = {
    gram: ethers.parseUnits("65.50", 8),      // $65.50 per gram
    ounce: ethers.parseUnits("2037.50", 8),  // $2037.50 per ounce
    k24: ethers.parseUnits("65.50", 8),      // $65.50 per gram (24K)
    k22: ethers.parseUnits("60.04", 8),      // $60.04 per gram (22K)
    k18: ethers.parseUnits("49.13", 8),      // $49.13 per gram (18K)
  };

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contract
    const GoldOracle = await ethers.getContractFactory("GoldOracle");
    goldOracle = await GoldOracle.deploy();
    await goldOracle.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await goldOracle.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await goldOracle.DECIMALS()).to.equal(8);
      expect(await goldOracle.STALENESS_THRESHOLD()).to.equal(3600); // 1 hour in seconds
    });

    it("Should initialize with zero prices", async function () {
      expect(await goldOracle.pricePerGram()).to.equal(0);
      expect(await goldOracle.pricePerOunce()).to.equal(0);
      expect(await goldOracle.pricePerKarat24()).to.equal(0);
      expect(await goldOracle.pricePerKarat22()).to.equal(0);
      expect(await goldOracle.pricePerKarat18()).to.equal(0);
      expect(await goldOracle.lastUpdated()).to.equal(0);
    });

    it("Should be stale when never updated", async function () {
      expect(await goldOracle.isStale()).to.equal(true);
    });
  });

  describe("Price Updates", function () {
    it("Should allow owner to update prices", async function () {
      await goldOracle.updatePrices(
        SAMPLE_PRICES.gram,
        SAMPLE_PRICES.ounce,
        SAMPLE_PRICES.k24,
        SAMPLE_PRICES.k22,
        SAMPLE_PRICES.k18
      );

      expect(await goldOracle.pricePerGram()).to.equal(SAMPLE_PRICES.gram);
      expect(await goldOracle.pricePerOunce()).to.equal(SAMPLE_PRICES.ounce);
      expect(await goldOracle.pricePerKarat24()).to.equal(SAMPLE_PRICES.k24);
      expect(await goldOracle.pricePerKarat22()).to.equal(SAMPLE_PRICES.k22);
      expect(await goldOracle.pricePerKarat18()).to.equal(SAMPLE_PRICES.k18);
    });

    it("Should update lastUpdated timestamp", async function () {
      const tx = await goldOracle.updatePrices(
        SAMPLE_PRICES.gram,
        SAMPLE_PRICES.ounce,
        SAMPLE_PRICES.k24,
        SAMPLE_PRICES.k22,
        SAMPLE_PRICES.k18
      );

      const block = await ethers.provider.getBlock(tx.blockNumber);
      expect(await goldOracle.lastUpdated()).to.equal(block.timestamp);
    });

    it("Should emit PricesUpdated event", async function () {
      await expect(
        goldOracle.updatePrices(
          SAMPLE_PRICES.gram,
          SAMPLE_PRICES.ounce,
          SAMPLE_PRICES.k24,
          SAMPLE_PRICES.k22,
          SAMPLE_PRICES.k18
        )
      )
        .to.emit(goldOracle, "PricesUpdated")
        .withArgs(
          SAMPLE_PRICES.gram,
          SAMPLE_PRICES.ounce,
          SAMPLE_PRICES.k24,
          SAMPLE_PRICES.k22,
          SAMPLE_PRICES.k18,
          await (async () => {
            const blockNum = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNum);
            return block.timestamp;
          })()
        );
    });

    it("Should reject updates from non-owner", async function () {
      await expect(
        goldOracle.connect(addr1).updatePrices(
          SAMPLE_PRICES.gram,
          SAMPLE_PRICES.ounce,
          SAMPLE_PRICES.k24,
          SAMPLE_PRICES.k22,
          SAMPLE_PRICES.k18
        )
      ).to.be.revertedWith("GoldOracle: caller is not the owner");
    });

    it("Should reject zero prices", async function () {
      await expect(
        goldOracle.updatePrices(0, SAMPLE_PRICES.ounce, SAMPLE_PRICES.k24, SAMPLE_PRICES.k22, SAMPLE_PRICES.k18)
      ).to.be.revertedWith("GoldOracle: invalid gram price");

      await expect(
        goldOracle.updatePrices(SAMPLE_PRICES.gram, 0, SAMPLE_PRICES.k24, SAMPLE_PRICES.k22, SAMPLE_PRICES.k18)
      ).to.be.revertedWith("GoldOracle: invalid ounce price");

      await expect(
        goldOracle.updatePrices(SAMPLE_PRICES.gram, SAMPLE_PRICES.ounce, 0, SAMPLE_PRICES.k22, SAMPLE_PRICES.k18)
      ).to.be.revertedWith("GoldOracle: invalid 24K price");
    });

    it("Should not be stale after recent update", async function () {
      await goldOracle.updatePrices(
        SAMPLE_PRICES.gram,
        SAMPLE_PRICES.ounce,
        SAMPLE_PRICES.k24,
        SAMPLE_PRICES.k22,
        SAMPLE_PRICES.k18
      );

      expect(await goldOracle.isStale()).to.equal(false);
    });
  });

  describe("Price Getters", function () {
    beforeEach(async function () {
      await goldOracle.updatePrices(
        SAMPLE_PRICES.gram,
        SAMPLE_PRICES.ounce,
        SAMPLE_PRICES.k24,
        SAMPLE_PRICES.k22,
        SAMPLE_PRICES.k18
      );
    });

    it("Should return correct price per gram", async function () {
      expect(await goldOracle.getGoldPricePerGram()).to.equal(SAMPLE_PRICES.gram);
    });

    it("Should return correct price per ounce", async function () {
      expect(await goldOracle.getGoldPricePerOunce()).to.equal(SAMPLE_PRICES.ounce);
    });

    it("Should return correct 24K price", async function () {
      expect(await goldOracle.getGoldPriceByKarat(24)).to.equal(SAMPLE_PRICES.k24);
    });

    it("Should return correct 22K price", async function () {
      expect(await goldOracle.getGoldPriceByKarat(22)).to.equal(SAMPLE_PRICES.k22);
    });

    it("Should return correct 18K price", async function () {
      expect(await goldOracle.getGoldPriceByKarat(18)).to.equal(SAMPLE_PRICES.k18);
    });

    it("Should revert for invalid karat", async function () {
      await expect(goldOracle.getGoldPriceByKarat(21)).to.be.revertedWith(
        "GoldOracle: invalid karat (must be 18, 22, or 24)"
      );
    });

    it("Should return all prices correctly", async function () {
      const allPrices = await goldOracle.getAllPrices();

      expect(allPrices.pricePerGram).to.equal(SAMPLE_PRICES.gram);
      expect(allPrices.pricePerOunce).to.equal(SAMPLE_PRICES.ounce);
      expect(allPrices.pricePerKarat24).to.equal(SAMPLE_PRICES.k24);
      expect(allPrices.pricePerKarat22).to.equal(SAMPLE_PRICES.k22);
      expect(allPrices.pricePerKarat18).to.equal(SAMPLE_PRICES.k18);
      expect(allPrices.lastUpdated).to.be.gt(0);
    });

    it("Should return correct last updated timestamp", async function () {
      const lastUpdated = await goldOracle.getLastUpdated();
      expect(lastUpdated).to.be.gt(0);
    });
  });

  describe("Staleness Check", function () {
    it("Should be stale when never updated", async function () {
      expect(await goldOracle.isStale()).to.equal(true);
    });

    it("Should not be stale immediately after update", async function () {
      await goldOracle.updatePrices(
        SAMPLE_PRICES.gram,
        SAMPLE_PRICES.ounce,
        SAMPLE_PRICES.k24,
        SAMPLE_PRICES.k22,
        SAMPLE_PRICES.k18
      );

      expect(await goldOracle.isStale()).to.equal(false);
    });

    it("Should be stale after threshold time", async function () {
      await goldOracle.updatePrices(
        SAMPLE_PRICES.gram,
        SAMPLE_PRICES.ounce,
        SAMPLE_PRICES.k24,
        SAMPLE_PRICES.k22,
        SAMPLE_PRICES.k18
      );

      // Increase time by more than 1 hour
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      expect(await goldOracle.isStale()).to.equal(true);
    });
  });

  describe("Ownership Transfer", function () {
    it("Should allow owner to transfer ownership", async function () {
      await goldOracle.transferOwnership(addr1.address);
      expect(await goldOracle.owner()).to.equal(addr1.address);
    });

    it("Should emit OwnershipTransferred event", async function () {
      await expect(goldOracle.transferOwnership(addr1.address))
        .to.emit(goldOracle, "OwnershipTransferred")
        .withArgs(owner.address, addr1.address);
    });

    it("Should prevent non-owner from transferring ownership", async function () {
      await expect(
        goldOracle.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith("GoldOracle: caller is not the owner");
    });

    it("Should prevent transferring to zero address", async function () {
      await expect(
        goldOracle.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("GoldOracle: new owner is the zero address");
    });

    it("Should allow new owner to update prices", async function () {
      await goldOracle.transferOwnership(addr1.address);

      await expect(
        goldOracle.connect(addr1).updatePrices(
          SAMPLE_PRICES.gram,
          SAMPLE_PRICES.ounce,
          SAMPLE_PRICES.k24,
          SAMPLE_PRICES.k22,
          SAMPLE_PRICES.k18
        )
      ).to.not.be.reverted;
    });

    it("Should prevent old owner from updating after transfer", async function () {
      await goldOracle.transferOwnership(addr1.address);

      await expect(
        goldOracle.connect(owner).updatePrices(
          SAMPLE_PRICES.gram,
          SAMPLE_PRICES.ounce,
          SAMPLE_PRICES.k24,
          SAMPLE_PRICES.k22,
          SAMPLE_PRICES.k18
        )
      ).to.be.revertedWith("GoldOracle: caller is not the owner");
    });
  });
});
