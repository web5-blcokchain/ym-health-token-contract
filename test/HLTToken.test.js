const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HLTToken", function () {
  let hltToken, owner, otherAccount, user1, user2;

  beforeEach(async function () {
    [owner, otherAccount, user1, user2] = await ethers.getSigners();
    
    const HLTToken = await ethers.getContractFactory("HLTToken");
    hltToken = await HLTToken.deploy("HealthLife Token", "HLT", owner.address, otherAccount.address);
    await hltToken.deployed();
  });

  describe("部署", function () {
    it("应该正确设置代币名称和符号", async function () {
      expect(await hltToken.name()).to.equal("HealthLife Token");
      expect(await hltToken.symbol()).to.equal("HLT");
    });

    it("应该正确设置总供应量", async function () {
      const totalSupply = await hltToken.TOTAL_SUPPLY();
      expect((await hltToken.totalSupply()).toString()).to.equal(totalSupply.toString());
    });

    it("应该将所有代币分配给部署者", async function () {
      const totalSupply = await hltToken.TOTAL_SUPPLY();
      expect((await hltToken.balanceOf(owner.address)).toString()).to.equal(totalSupply.toString());
    });

    it("应该正确设置其他账号地址", async function () {
      expect(await hltToken.otherAccount()).to.equal(otherAccount.address);
    });

    it("应该正确设置所有者", async function () {
      expect(await hltToken.owner()).to.equal(owner.address);
    });
  });

  describe("合约地址设置", function () {
    it("应该允许所有者设置众筹合约地址", async function () {
      await hltToken.setCrowdsaleContract(user1.address);
      expect(await hltToken.crowdsaleContract()).to.equal(user1.address);
    });

    it("非所有者不能设置众筹合约地址", async function () {
      try {
        await hltToken.connect(user1).setCrowdsaleContract(user2.address);
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error.message).to.include("OwnableUnauthorizedAccount");
      }
    });

    it("不能设置零地址", async function () {
      try {
        await hltToken.setCrowdsaleContract(ethers.constants.AddressZero);
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error.message).to.include("Invalid address");
      }
    });
  });

  describe("锁仓功能", function () {
    beforeEach(async function () {
      await hltToken.setCrowdsaleContract(user1.address);
    });

    it("众筹合约应该能够设置用户锁仓时间", async function () {
      const lockTime = Math.floor(Date.now() / 1000);
      await hltToken.connect(user1).setUserLockTime(user2.address, lockTime);
      expect((await hltToken.userLockTime(user2.address)).toNumber()).to.equal(lockTime);
    });

    it("非众筹合约不能设置用户锁仓时间", async function () {
      const lockTime = Math.floor(Date.now() / 1000);
      try {
        await hltToken.connect(user2).setUserLockTime(user1.address, lockTime);
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error.message).to.include("Only crowdsale contract can set lock time");
      }
    });

    it("应该正确检查用户是否被锁仓", async function () {
      const lockTime = Math.floor(Date.now() / 1000);
      await hltToken.connect(user1).setUserLockTime(user2.address, lockTime);
      
      expect(await hltToken.isUserLocked(user2.address)).to.be.true;
      expect(await hltToken.isUserLocked(user1.address)).to.be.false;
    });

    it("应该正确计算解锁时间", async function () {
      const lockTime = Math.floor(Date.now() / 1000);
      await hltToken.connect(user1).setUserLockTime(user2.address, lockTime);
      
      const unlockTime = await hltToken.getUserUnlockTime(user2.address);
      const expectedUnlockTime = lockTime + (365 * 24 * 60 * 60); // 365 days
      expect(unlockTime.toNumber()).to.equal(expectedUnlockTime);
    });

    it("应该正确计算剩余锁仓时间", async function () {
      const lockTime = Math.floor(Date.now() / 1000);
      await hltToken.connect(user1).setUserLockTime(user2.address, lockTime);
      
      const remainingTime = await hltToken.getUserRemainingLockTime(user2.address);
      expect(remainingTime.toNumber()).to.be.gt(0);
    });

    it("锁仓用户不能转移代币", async function () {
      const lockTime = Math.floor(Date.now() / 1000);
      await hltToken.connect(user1).setUserLockTime(owner.address, lockTime);
      
      try {
        await hltToken.transfer(user2.address, ethers.utils.parseEther("1000"));
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error.message).to.include("Tokens are locked for 12 months");
      }
    });

    it("锁仓用户不能通过transferFrom转移代币", async function () {
      const lockTime = Math.floor(Date.now() / 1000);
      await hltToken.connect(user1).setUserLockTime(owner.address, lockTime);
      
      await hltToken.approve(user2.address, ethers.utils.parseEther("1000"));
      
      try {
        await hltToken.connect(user2).transferFrom(owner.address, user1.address, ethers.utils.parseEther("1000"));
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error.message).to.include("Tokens are locked for 12 months");
      }
    });
  });

  describe("其他代币转移", function () {
    it("所有者应该能够转移其他代币到指定账号", async function () {
      const otherAmount = await hltToken.OTHER_AMOUNT();
      await hltToken.transferOtherTokens();
      
      expect((await hltToken.balanceOf(otherAccount.address)).toString()).to.equal(otherAmount.toString());
      expect(await hltToken.otherTokensTransferred()).to.be.true;
    });

    it("非所有者不能转移其他代币", async function () {
      try {
        await hltToken.connect(user1).transferOtherTokens();
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error.message).to.include("OwnableUnauthorizedAccount");
      }
    });

    it("不能重复转移其他代币", async function () {
      await hltToken.transferOtherTokens();
      
      try {
        await hltToken.transferOtherTokens();
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error.message).to.include("Other tokens already transferred");
      }
    });
  });

  describe("标准ERC20功能", function () {
    it("应该能够转移代币", async function () {
      const amount = ethers.utils.parseEther("1000");
      await hltToken.transfer(user1.address, amount);
      expect((await hltToken.balanceOf(user1.address)).toString()).to.equal(amount.toString());
    });

    it("应该能够授权和转移代币", async function () {
      const amount = ethers.utils.parseEther("1000");
      await hltToken.approve(user1.address, amount);
      await hltToken.connect(user1).transferFrom(owner.address, user2.address, amount);
      expect((await hltToken.balanceOf(user2.address)).toString()).to.equal(amount.toString());
    });
  });

  describe("查询功能", function () {
    it("应该能够查询代币分配状态", async function () {
      expect(await hltToken.getTokenAllocationStatus()).to.be.false;
      
      await hltToken.transferOtherTokens();
      expect(await hltToken.getTokenAllocationStatus()).to.be.true;
    });

    it("应该能够查询合约地址", async function () {
      const [crowdsaleContract, otherAccountAddr] = await hltToken.getContractAddresses();
      expect(crowdsaleContract).to.equal(ethers.constants.AddressZero);
      expect(otherAccountAddr).to.equal(otherAccount.address);
    });

    it("应该能够查询代币分配数量", async function () {
      const [totalSupply, saleAmount, otherAmount] = await hltToken.getTokenAllocationAmounts();
      expect(totalSupply.toString()).to.equal((await hltToken.TOTAL_SUPPLY()).toString());
      expect(saleAmount.toString()).to.equal((await hltToken.SALE_AMOUNT()).toString());
      expect(otherAmount.toString()).to.equal((await hltToken.OTHER_AMOUNT()).toString());
    });
  });

  describe("常量查询", function () {
    it("应该能够查询锁仓期限", async function () {
      const lockDuration = await hltToken.LOCK_DURATION();
      expect(lockDuration.toNumber()).to.equal(365 * 24 * 60 * 60); // 365 days
    });

    it("应该能够查询代币分配常量", async function () {
      const totalSupply = await hltToken.TOTAL_SUPPLY();
      const saleAmount = await hltToken.SALE_AMOUNT();
      const otherAmount = await hltToken.OTHER_AMOUNT();
      
      expect(totalSupply.toString()).to.equal(ethers.utils.parseEther("100000000").toString()); // 1亿
      expect(saleAmount.toString()).to.equal(ethers.utils.parseEther("24000000").toString());  // 2400万
      expect(otherAmount.toString()).to.equal(ethers.utils.parseEther("76000000").toString()); // 7600万
    });
  });
});
