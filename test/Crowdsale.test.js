const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdsale", function () {
    let crowdsale, hltToken, usdtToken, owner, user1, user2;
    
    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // 部署HLT代币
        const HLTToken = await ethers.getContractFactory("HLTToken");
        hltToken = await HLTToken.deploy("HealthLife Token", "HLT", owner.address, user2.address);
        
        // 部署MockUSDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        const usdtName = "Tether USD";
        const usdtSymbol = "USDT";
        usdtToken = await MockUSDT.deploy(owner.address);
        
        // 部署众筹合约
        const Crowdsale = await ethers.getContractFactory("Crowdsale");
        crowdsale = await Crowdsale.deploy(hltToken.address, usdtToken.address, owner.address);
        
        // 设置众筹合约地址
        await hltToken.setCrowdsaleContract(crowdsale.address);
        
        // 给众筹合约分配代币
        const saleAmount = await hltToken.SALE_AMOUNT();
        await hltToken.transfer(crowdsale.address, saleAmount);
        
        // 给用户1一些USDT
        const userUSDTAmount = ethers.utils.parseUnits("10000", 6); // 1万USDT
        await usdtToken.mint(user1.address, userUSDTAmount);
        
        // 给用户2一些USDT
        await usdtToken.mint(user2.address, userUSDTAmount);
    });
    
    describe("部署", function () {
        it("应该正确设置合约参数", async function () {
            expect(await crowdsale.token()).to.equal(hltToken.address);
            expect(await crowdsale.usdtToken()).to.equal(usdtToken.address);
            expect(await crowdsale.owner()).to.equal(owner.address);
        });
        
        it("应该正确设置代币价格", async function () {
            const price = await crowdsale.getTokenPrice();
            expect(price.toString()).to.equal("12"); // 默认价格：1 USDT = 12 HLT
        });
        
        it("应该正确设置购买限制", async function () {
            const minPurchase = await crowdsale.MIN_PURCHASE_USDT();
            const maxPurchase = await crowdsale.MAX_PURCHASE_USDT();
            
            expect(minPurchase.toString()).to.equal("1000000"); // 1 USDT (6位小数)
            expect(maxPurchase.toString()).to.equal("1000000000000"); // 100万 USDT (6位小数)
        });
    });
    
    describe("众筹管理", function () {
        it("所有者应该能够开始众筹", async function () {
            await crowdsale.startCrowdsale();
            
            const status = await crowdsale.getCrowdsaleStatus();
            expect(status[0]).to.be.true; // crowdsaleActive
            expect(status[1]).to.be.false; // crowdsaleEnded
            expect(status[2].toNumber()).to.be.gt(0); // startTime
            expect(status[3].toNumber()).to.equal(0); // endTime (未设置)
        });
        
        it("非所有者不能开始众筹", async function () {
            try {
                await crowdsale.connect(user1).startCrowdsale();
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
        });
        
        it("不能重复开始众筹", async function () {
            await crowdsale.startCrowdsale();
            
            try {
                await crowdsale.startCrowdsale();
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Crowdsale already active");
            }
        });
        
        it("所有者应该能够结束众筹", async function () {
            await crowdsale.startCrowdsale();
            await crowdsale.endCrowdsale();
            
            const status = await crowdsale.getCrowdsaleStatus();
            expect(status[0]).to.be.false; // crowdsaleActive
            expect(status[1]).to.be.true;  // crowdsaleEnded
            expect(status[3].toNumber()).to.be.gt(0); // endTime
        });
        
        it("所有者应该能够紧急停止众筹", async function () {
            await crowdsale.startCrowdsale();
            await crowdsale.emergencyStop();
            
            const status = await crowdsale.getCrowdsaleStatus();
            expect(status[0]).to.be.false; // crowdsaleActive
            expect(status[1]).to.be.true;  // crowdsaleEnded
        });
        
        it("所有者应该能够设置代币价格", async function () {
            const newPrice = 15; // 1 USDT = 15 HLT
            await crowdsale.setTokenPrice(newPrice);
            
            const currentPrice = await crowdsale.getTokenPrice();
            expect(currentPrice.toString()).to.equal(newPrice.toString());
        });
        
        it("非所有者不能设置代币价格", async function () {
            const newPrice = 15;
            try {
                await crowdsale.connect(user1).setTokenPrice(newPrice);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
        });
        
        it("不能设置零价格", async function () {
            try {
                await crowdsale.setTokenPrice(0);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Price must be greater than 0");
            }
        });
    });
    
    describe("代币购买", function () {
        beforeEach(async function () {
            // 开始众筹
            await crowdsale.startCrowdsale();
            
            // 给用户1一些USDT
            const usdtAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
            await usdtToken.mint(user1.address, usdtAmount);
            
            // 用户1授权众筹合约使用USDT
            await usdtToken.connect(user1).approve(crowdsale.address, usdtAmount);
        });
        
        it("用户应该能够购买代币", async function () {
            const usdtAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
            const expectedHLT = usdtAmount.mul(12); // 1 USDT = 12 HLT
            
            await crowdsale.connect(user1).buyTokens(usdtAmount);
            
            const userInfo = await crowdsale.getUserInfo(user1.address);
            expect(userInfo[0].toString()).to.equal(usdtAmount.toString()); // USDT数量
            expect(userInfo[1]).to.eq(expectedHLT); // HLT数量
            expect(userInfo[2]).to.be.true; // 参与状态
        });
        
        it("应该正确计算代币数量", async function () {
            const usdtAmount = ethers.utils.parseUnits("50", 6); // 50 USDT
            const expectedHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            
            await crowdsale.connect(user1).buyTokens(usdtAmount);
            
            const userInfo = await crowdsale.getUserInfo(user1.address);
            expect(userInfo[1]).to.eq(expectedHLT);
        });
        
        it("应该正确计算USDT数量", async function () {
            const hltAmount = ethers.utils.parseEther("600"); // 600 HLT
            const expectedUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
            
            expect(expectedUSDT.toString()).to.equal("50000000"); // 50 USDT (考虑精度)
        });
        
        it("不能购买少于最小数量", async function () {
            const usdtAmount = ethers.utils.parseUnits("0.5", 6); // 0.5 USDT (小于1 USDT)
            
            try {
                await crowdsale.connect(user1).buyTokens(usdtAmount);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Amount too small");
            }
        });
        
        it("不能购买超过最大数量", async function () {
            const usdtAmount = ethers.utils.parseUnits("2000000", 6); // 200万 USDT (超过100万)
            
            try {
                await crowdsale.connect(user1).buyTokens(usdtAmount);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Amount too large");
            }
        });
        
        it("众筹结束后不能购买", async function () {
            await crowdsale.endCrowdsale();
            
            const usdtAmount = ethers.utils.parseUnits("100", 6);
            
            try {
                await crowdsale.connect(user1).buyTokens(usdtAmount);
                throw new Error("应该抛出错误");
            } catch (error) {
                // 检查错误消息是否包含 "Crowdsale not active" 或 "Crowdsale ended"
                const errorMessage = error.message || error.toString();
                expect(errorMessage).to.include("Crowdsale not active");
            }
        });
        
        it("需要足够的USDT授权", async function () {
            const usdtAmount = ethers.utils.parseUnits("100", 6);
            
            // 撤销授权
            await usdtToken.connect(user1).approve(crowdsale.address, 0);
            
            try {
                await crowdsale.connect(user1).buyTokens(usdtAmount);
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Insufficient USDT allowance");
            }
        });
        
        it("价格设置后应该影响代币计算", async function () {
            // 设置新价格：1 USDT = 15 HLT
            await crowdsale.setTokenPrice(15);
            
            const usdtAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
            const expectedHLT = usdtAmount.mul(15); // 现在1 USDT = 15 HLT
            
            await crowdsale.connect(user1).buyTokens(usdtAmount);
            
            const userInfo = await crowdsale.getUserInfo(user1.address);
            expect(userInfo[1]).to.eq(expectedHLT);
        });
    });
    
    describe("用户信息查询", function () {
        it("应该能够查询用户购买信息", async function () {
            await crowdsale.startCrowdsale();
            
            const usdtAmount = ethers.utils.parseUnits("100", 6);
            await usdtToken.connect(user1).approve(crowdsale.address, usdtAmount);
            await crowdsale.connect(user1).buyTokens(usdtAmount);
            
            const userInfo = await crowdsale.getUserInfo(user1.address);
            
            expect(userInfo[0].toString()).to.equal(ethers.utils.parseUnits("100", 6).toString()); // USDT购买量
            expect(userInfo[1].toString()).to.equal(ethers.utils.parseUnits("1200", 18).toString()); // HLT数量
            expect(userInfo[2]).to.be.true; // 已参与
        });
        
        it("应该能够查询众筹状态", async function () {
            await crowdsale.startCrowdsale();
            
            const usdtAmount = ethers.utils.parseUnits("100", 6);
            await usdtToken.connect(user1).approve(crowdsale.address, usdtAmount);
            await crowdsale.connect(user1).buyTokens(usdtAmount);
            
            const status = await crowdsale.getCrowdsaleStatus();
            
            expect(status[0]).to.be.true; // 众筹激活
            expect(status[1]).to.be.false; // 众筹未结束
            expect(status[4].toString()).to.equal(ethers.utils.parseUnits("100", 6).toString()); // 总USDT
            expect(status[5].toString()).to.equal(ethers.utils.parseUnits("1200", 18).toString()); // 总HLT
            expect(status[6].toNumber()).to.equal(1); // 参与人数
        });
        
        it("应该能够查询剩余时间", async function () {
            await crowdsale.startCrowdsale();
            
            const remainingTime = await crowdsale.getRemainingTime();
            expect(remainingTime.toString()).to.equal(ethers.constants.MaxUint256.toString()); // 未设置结束时间时返回最大值
        });
        
        it("应该能够查询代币价格", async function () {
            const price = await crowdsale.getTokenPrice();
            expect(price.toString()).to.equal("12"); // 默认价格：1 USDT = 12 HLT
        });
    });
    
    describe("资金提取", function () {
        it("众筹结束后所有者应该能够提取USDT", async function () {
            await crowdsale.startCrowdsale();
            
            const usdtAmount = ethers.utils.parseUnits("100", 6);
            await usdtToken.connect(user1).approve(crowdsale.address, usdtAmount);
            await crowdsale.connect(user1).buyTokens(usdtAmount);
            
            await crowdsale.endCrowdsale();
            
            const initialBalance = await usdtToken.balanceOf(owner.address);
            await crowdsale.withdrawUSDT();
            
            const finalBalance = await usdtToken.balanceOf(owner.address);
            expect(finalBalance.toString()).to.equal(initialBalance.add(ethers.utils.parseUnits("100", 6)).toString());
        });
        
        it("众筹未结束时不能提取USDT", async function () {
            await crowdsale.startCrowdsale();
            
            try {
                await crowdsale.withdrawUSDT();
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("Crowdsale not ended");
            }
        });
        
        it("非所有者不能提取USDT", async function () {
            try {
                await crowdsale.connect(user1).withdrawUSDT();
                throw new Error("应该抛出错误");
            } catch (error) {
                expect(error.message).to.include("OwnableUnauthorizedAccount");
            }
        });
    });
    
    describe("边界情况", function () {
        it("重复购买应该正确累加", async function () {
            await crowdsale.startCrowdsale();
            
            const usdtAmount1 = ethers.utils.parseUnits("50", 6);
            const usdtAmount2 = ethers.utils.parseUnits("30", 6);
            
            await usdtToken.connect(user1).approve(crowdsale.address, usdtAmount1.add(usdtAmount2));
            
            await crowdsale.connect(user1).buyTokens(usdtAmount1);
            await crowdsale.connect(user1).buyTokens(usdtAmount2);
            
            const userInfo = await crowdsale.getUserInfo(user1.address);
            const totalUSDT = usdtAmount1.add(usdtAmount2);
            const totalHLT = totalUSDT.mul(ethers.utils.parseUnits("12", 12));
            
            expect(userInfo[0].toString()).to.equal(totalUSDT.toString());
            expect(userInfo[1].toString()).to.equal(totalHLT.toString());
        });
    });
});

describe("MockUSDT", function () {
    let mockUSDT;
    let owner;
    
    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        mockUSDT = await MockUSDT.deploy(owner.address);
    });
    
    it("应该正确设置代币参数", async function () {
        expect(await mockUSDT.name()).to.equal("Mock USDT");
        expect(await mockUSDT.symbol()).to.equal("USDT");
        expect(await mockUSDT.decimals()).to.equal(6);
    });
    
    it("所有者应该能够铸造代币", async function () {
        const amount = ethers.utils.parseUnits("1000", 6);
        await mockUSDT.mint(owner.address, amount);
        
        const balance = await mockUSDT.balanceOf(owner.address);
        expect(balance.toString()).to.equal(amount.toString());
    });
});

// 辅助函数
async function time() {
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    return block.timestamp;
}
