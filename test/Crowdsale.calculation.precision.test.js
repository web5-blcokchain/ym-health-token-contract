const { expect } = require("chai");
const { ethers, network } = require("hardhat");

/**
 * Crowdsale - calculation & precision tests
 * Focus on:
 * - decimals handling (USDT 6, HLT 18)
 * - calculateHLTAmount / calculateUSDTAmount consistency
 * - buyTokens accounting equals calculated HLT
 * - price updates keep consistency
 */

describe("Crowdsale - calculation & precision", function () {
  async function deployEnv() {
    const [owner, otherAccount, buyer] = await ethers.getSigners();

    // Deploy MockUSDT(6 decimals)
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy(owner.address);
    await (usdt.deployed?.() ?? Promise.resolve());
    await (usdt.waitForDeployment?.() ?? Promise.resolve());

    // Deploy HLTToken(18 decimals)
    const HLTToken = await ethers.getContractFactory("HLTToken");
    const token = await HLTToken.deploy("HealthLife Token", "HLT", owner.address, otherAccount.address);
    await (token.deployed?.() ?? Promise.resolve());
    await (token.waitForDeployment?.() ?? Promise.resolve());

    // Deploy LockVault
    const LockVault = await ethers.getContractFactory("LockVault");
    const vault = await LockVault.deploy(token.address ?? (await token.getAddress()), owner.address);
    await (vault.deployed?.() ?? Promise.resolve());
    await (vault.waitForDeployment?.() ?? Promise.resolve());

    // Deploy Crowdsale
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const lockDuration = 3600; // 1小时，测试更快
    const crowdsale = await Crowdsale.deploy(
      token.address ?? (await token.getAddress()),
      usdt.address ?? (await usdt.getAddress()),
      owner.address,
      lockDuration
    );
    await (crowdsale.deployed?.() ?? Promise.resolve());
    await (crowdsale.waitForDeployment?.() ?? Promise.resolve());

    // Wire Crowdsale <-> Vault
    await (await crowdsale.connect(owner).setVault(vault.address ?? (await vault.getAddress()))).wait();
    await (await vault.connect(owner).setCrowdsale(crowdsale.address ?? (await crowdsale.getAddress()))).wait();

    // Fund Crowdsale with sufficient HLT for tests
    const saleFund = ethers.utils.parseUnits("20000000", 18); // 20,000,000 HLT to avoid insufficiency in tests
    await (await token.connect(owner).transfer(crowdsale.address ?? (await crowdsale.getAddress()), saleFund)).wait();

    // Start crowdsale
    await (await crowdsale.connect(owner).startCrowdsale()).wait();

    return { owner, otherAccount, buyer, usdt, token, crowdsale, vault };
  }

  // simple generic revert checker (avoid waffle matchers)
  async function expectRevert(promise) {
    let reverted = false;
    try {
      const tx = await promise;
      await tx.wait?.();
    } catch (e) {
      reverted = true;
    }
    if (!reverted) {
      throw new Error("Expected revert but the tx succeeded");
    }
  }

  it("decimals and initial price consistent", async function () {
    const { usdt, token, crowdsale } = await deployEnv();

    const usdtDecimals = await usdt.decimals();
    const hltDecimals = await token.decimals();
    const initialPrice = await crowdsale.tokensPerUSDT();

    expect(usdtDecimals).to.equal(6);
    expect(hltDecimals).to.equal(18);
    expect(initialPrice.toString()).to.equal("12"); // default 1 USDT = 12 HLT

    // quick check: 1 USDT => 12 HLT
    const oneUSDT = ethers.utils.parseUnits("1", 6);
    const expectedHLT = await crowdsale.calculateHLTAmount(oneUSDT);
    expect(expectedHLT.toString()).to.equal(ethers.utils.parseUnits("12", 18).toString());
  });

  it("calculateHLTAmount matches buyTokens accounting (several amounts)", async function () {
    const { owner, buyer, usdt, crowdsale } = await deployEnv();

    // prepare buyer USDT and approve
    const amounts = ["1", "1.23", "100", "9999.999999"]; // all >= MIN (1 USDT)
    for (const amt of amounts) {
      const usdtAmt = ethers.utils.parseUnits(amt, 6);
      await (await usdt.connect(owner).mint(buyer.address, usdtAmt)).wait();
      await (await usdt.connect(buyer).approve(crowdsale.address ?? (await crowdsale.getAddress()), usdtAmt)).wait();

      const expectedHLT = await crowdsale.calculateHLTAmount(usdtAmt);

      const beforeUserHLT = await crowdsale.userHLTAmount(buyer.address);
      const beforeSold = await crowdsale.totalHLTSold();
      const beforeRaised = await crowdsale.totalUSDTRaised();

      await (await crowdsale.connect(buyer).buyTokens(usdtAmt)).wait();

      const afterUserHLT = await crowdsale.userHLTAmount(buyer.address);
      const afterSold = await crowdsale.totalHLTSold();
      const afterRaised = await crowdsale.totalUSDTRaised();

      expect(afterUserHLT.sub(beforeUserHLT).toString()).to.equal(expectedHLT.toString());
      expect(afterSold.sub(beforeSold).toString()).to.equal(expectedHLT.toString());
      expect(afterRaised.sub(beforeRaised).toString()).to.equal(usdtAmt.toString());

      // round-trip: USDT -> HLT -> USDT equals original exactly
      const backUSDT = await crowdsale.calculateUSDTAmount(expectedHLT);
      expect(backUSDT.toString()).to.equal(usdtAmt.toString());
    }
  });

  it("HLT -> USDT -> HLT floors to nearest multiple (no precision gain)", async function () {
    const { crowdsale } = await deployEnv();

    const price = await crowdsale.tokensPerUSDT(); // e.g., 12
    const unit = price.mul(ethers.BigNumber.from("1000000000000")); // tokensPerUSDT * 1e12

    // arbitrary HLT amount not necessarily aligned to unit (e.g., 123.456789 HLT)
    const hlt = ethers.utils.parseUnits("123.456789", 18);

    const toUSDT = await crowdsale.calculateUSDTAmount(hlt);
    const roundTripHLT = await crowdsale.calculateHLTAmount(toUSDT);

    // roundTripHLT <= original hlt and within one unit difference
    expect(roundTripHLT.lte(hlt)).to.equal(true);
    const diff = hlt.sub(roundTripHLT);
    expect(diff.lt(unit)).to.equal(true);
  });

  it("price update keeps calculation consistent", async function () {
    const { owner, buyer, usdt, crowdsale } = await deployEnv();

    // update price to 37 HLT per USDT
    await (await crowdsale.connect(owner).setTokenPrice(37)).wait();

    const amounts = ["1", "2.5", "10.000001"]; // valid amounts
    for (const amt of amounts) {
      const usdtAmt = ethers.utils.parseUnits(amt, 6);
      await (await usdt.connect(owner).mint(buyer.address, usdtAmt)).wait();
      await (await usdt.connect(buyer).approve(crowdsale.address ?? (await crowdsale.getAddress()), usdtAmt)).wait();

      const expectedHLT = await crowdsale.calculateHLTAmount(usdtAmt);
      const before = await crowdsale.userHLTAmount(buyer.address);
      await (await crowdsale.connect(buyer).buyTokens(usdtAmt)).wait();
      const after = await crowdsale.userHLTAmount(buyer.address);

      expect(after.sub(before).toString()).to.equal(expectedHLT.toString());

      // round-trip remains exact
      const backUSDT = await crowdsale.calculateUSDTAmount(expectedHLT);
      expect(backUSDT.toString()).to.equal(usdtAmt.toString());
    }
  });

  it("buyTokens enforces MIN purchase, while calculation works for any input", async function () {
    const { owner, buyer, usdt, crowdsale } = await deployEnv();

    const belowMin = ethers.utils.parseUnits("0.5", 6); // 0.5 USDT

    // calculation still returns a number
    const computed = await crowdsale.calculateHLTAmount(belowMin);
    expect(computed.gt(ethers.constants.Zero)).to.equal(true);

    // but buyTokens reverts due to min
    await (await usdt.connect(owner).mint(buyer.address, belowMin)).wait();
    await (await usdt.connect(buyer).approve(crowdsale.address ?? (await crowdsale.getAddress()), belowMin)).wait();
    await expectRevert(crowdsale.connect(buyer).buyTokens(belowMin));
  });
});