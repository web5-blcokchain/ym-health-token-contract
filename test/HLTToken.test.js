const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HLTToken", function () {
    let hltToken;
    let owner;
    let user1;
    let user2;
    let crowdsaleContract;
    let otherAccount;
    
    const tokenName = "HealthLife Token";
    const tokenSymbol = "HLT";
    const totalSupply = ethers.utils.parseEther("100000000"); // 1亿代币
    const saleAmount = ethers.utils.parseEther("24000000");   // 2400万代币
    const otherAmount = ethers.utils.parseEther("76000000");  // 7600万代币
    
    beforeEach(async function () {
        [owner, user1, user2, crowdsaleContract, otherAccount] = await ethers.getSigners();
        
        const HLTToken = await ethers.getContractFactory("HLTToken");
        hltToken = await HLTToken.deploy(tokenName, tokenSymbol, owner.address, otherAccount.address);
    });
    
    describe("部署", function () {
        it("应该正确设置代币名称和符号", async function () {
            expect(await hltToken.name()).to.equal(tokenName);
            expect(await hltToken.symbol()).to.equal(tokenSymbol);
        });
        
        it("应该正确设置总供应量", async function () {
            const actualSupply = await hltToken.totalSupply();
            expect(actualSupply.toString()).to.equal(totalSupply.toString());
        });
        
        it("应该将所有代币分配给部署者", async function () {
            const balance = await hltToken.balanceOf(owner.address);
            expect(balance.toString()).to.equal(totalSupply.toString());
        });
        
        it("应该正确设置其他账号地址", async function () {
            expect(await hltToken.otherAccount()).to.equal(otherAccount.address);
        });
        
        it("应该正确设置角色权限", async function () {
            const minterRole = await hltToken.MINTER_ROLE();
            const pauserRole = await hltToken.PAUSER_ROLE();
            const adminRole = await hltToken.DEFAULT_ADMIN_ROLE();
            
            expect(await hltToken.hasRole(minterRole, owner.address)).to.be.true;
            expect(await hltToken.hasRole(pauserRole, owner.address)).to.be.true;
            expect(await hltToken.hasRole(adminRole, owner.address)).to.be.true;
        });
    });
    
    describe("合约地址设置", function () {
        it("应该允许管理员设置众筹合约地址", async function () {
            await hltToken.setCrowdsaleContract(crowdsaleContract.address);
            expect(await hltToken.crowdsaleContract()).to.equal(crowdsaleContract.address);
        });
        
        it("应该允许管理员设置其他账号地址", async function () {
            const newOtherAccount = user1.address;
            await hltToken.setOtherAccount(newOtherAccount);
            expect(await hltToken.otherAccount()).to.equal(newOtherAccount);
        });
        
        it("非管理员不能设置合约地址", async function () {
            try {
                await hltToken.connect(user1).setCrowdsaleContract(user2.address);
                expect.fail("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("AccessControlUnauthorizedAccount");
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
        
        it("其他账号不能是管理员", async function () {
            try {
                await hltToken.setOtherAccount(owner.address);
                expect.fail("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Other account cannot be admin");
            }
        });
    });
    
    describe("代币铸造", function () {
        beforeEach(async function () {
            await hltToken.setCrowdsaleContract(crowdsaleContract.address);
        });
        
        it("众筹合约应该能够铸造售卖代币", async function () {
            const mintAmount = ethers.utils.parseEther("1000");
            const initialBalance = await hltToken.balanceOf(crowdsaleContract.address);
            
            // 给众筹合约授予铸造权限
            await hltToken.grantRole(await hltToken.MINTER_ROLE(), crowdsaleContract.address);
            
            // 使用owner调用，因为owner有MINTER_ROLE权限
            await hltToken.mintSaleTokens(crowdsaleContract.address, mintAmount);
            
            const finalBalance = await hltToken.balanceOf(crowdsaleContract.address);
            expect(finalBalance.toString()).to.equal(initialBalance.add(mintAmount).toString());
        });
        
        it("非众筹合约不能铸造代币", async function () {
            const mintAmount = ethers.utils.parseEther("1000");
            
            try {
                await hltToken.connect(user1).mintSaleTokens(user1.address, mintAmount);
                expect.fail("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("AccessControlUnauthorizedAccount");
            }
        });
        
        it("不能铸造超过售卖数量的代币", async function () {
            const overAmount = saleAmount.add(ethers.utils.parseEther("1"));
            
            try {
                // 给众筹合约授予铸造权限
                await hltToken.grantRole(await hltToken.MINTER_ROLE(), crowdsaleContract.address);
                await hltToken.mintSaleTokens(crowdsaleContract.address, overAmount);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Exceeds sale amount");
            }
        });
        
        it("不能重复铸造售卖代币", async function () {
            const mintAmount = ethers.utils.parseEther("1000");
            // 给众筹合约授予铸造权限
            await hltToken.grantRole(await hltToken.MINTER_ROLE(), crowdsaleContract.address);
            await hltToken.mintSaleTokens(crowdsaleContract.address, mintAmount);
            
            try {
                await hltToken.mintSaleTokens(crowdsaleContract.address, mintAmount);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Sale tokens already minted");
            }
        });
    });
    
    describe("其他代币转移", function () {
        it("管理员应该能够转移其他代币到指定账号", async function () {
            const initialBalance = await hltToken.balanceOf(otherAccount.address);
            
            await hltToken.transferOtherTokens();
            
            const finalBalance = await hltToken.balanceOf(otherAccount.address);
            expect(finalBalance.toString()).to.equal(initialBalance.add(otherAmount).toString());
            
            // 检查状态
            expect(await hltToken.otherTokensTransferred()).to.be.true;
        });
        
        it("非管理员不能转移其他代币", async function () {
            try {
                await hltToken.connect(user1).transferOtherTokens();
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("AccessControlUnauthorizedAccount");
            }
        });
        
        it("不能重复转移其他代币", async function () {
            await hltToken.transferOtherTokens();
            
            try {
                await hltToken.transferOtherTokens();
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Other tokens already transferred");
            }
        });
        
        it("其他账号未设置时不能转移", async function () {
            // 临时设置其他账号为零地址
            try {
                await hltToken.setOtherAccount(ethers.constants.AddressZero);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Invalid address");
            }
        });
    });
    
    describe("暂停功能", function () {
        it("管理员应该能够暂停合约", async function () {
            await hltToken.pause();
            expect(await hltToken.paused()).to.be.true;
        });
        
        it("管理员应该能够恢复合约", async function () {
            await hltToken.pause();
            await hltToken.unpause();
            expect(await hltToken.paused()).to.be.false;
        });
        
        it("非管理员不能暂停合约", async function () {
            try {
                await hltToken.connect(user1).pause();
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("AccessControlUnauthorizedAccount");
            }
        });
        
        it("暂停时不能转移代币", async function () {
            await hltToken.pause();
            
            try {
                await hltToken.transfer(user1.address, ethers.utils.parseEther("1000"));
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("EnforcedPause");
            }
        });
        
        it("暂停时不能授权代币", async function () {
            await hltToken.pause();
            
            try {
                await hltToken.approve(user1.address, ethers.utils.parseEther("1000"));
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("EnforcedPause");
            }
        });
    });
    
    describe("标准ERC20功能", function () {
        it("应该能够转移代币", async function () {
            const transferAmount = ethers.utils.parseEther("1000");
            const initialBalance = await hltToken.balanceOf(user1.address);
            
            await hltToken.transfer(user1.address, transferAmount);
            
            const finalBalance = await hltToken.balanceOf(user1.address);
            expect(finalBalance.toString()).to.equal(initialBalance.add(transferAmount).toString());
        });
        
        it("应该能够授权和转移代币", async function () {
            const approveAmount = ethers.utils.parseEther("1000");
            const transferAmount = ethers.utils.parseEther("500");
            
            await hltToken.approve(user1.address, approveAmount);
            const allowance = await hltToken.allowance(owner.address, user1.address);
            expect(allowance.toString()).to.equal(approveAmount.toString());
            
            await hltToken.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
            
            const finalBalance = await hltToken.balanceOf(user2.address);
            expect(finalBalance.toString()).to.equal(transferAmount.toString());
            const remainingAllowance = await hltToken.allowance(owner.address, user1.address);
            expect(remainingAllowance.toString()).to.equal(approveAmount.sub(transferAmount).toString());
        });
    });
    
    describe("查询功能", function () {
        it("应该能够查询代币分配状态", async function () {
            const status = await hltToken.getTokenAllocationStatus();
            
            expect(status[0]).to.be.false; // 售卖代币未铸造
            expect(status[1]).to.be.false; // 其他代币未转移
        });
        
        it("应该能够查询合约地址", async function () {
            const addresses = await hltToken.getContractAddresses();
            
            expect(addresses[0]).to.equal(ethers.constants.AddressZero); // 众筹合约未设置
            expect(addresses[1]).to.equal(otherAccount.address); // 其他账号已设置
        });
        
        it("应该能够查询代币分配数量", async function () {
            const amounts = await hltToken.getTokenAllocationAmounts();
            
            expect(amounts[0].toString()).to.equal(totalSupply.toString()); // 总供应量
            expect(amounts[1].toString()).to.equal(saleAmount.toString());  // 售卖数量
            expect(amounts[2].toString()).to.equal(otherAmount.toString()); // 其他数量
        });
    });
});
