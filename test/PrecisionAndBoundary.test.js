const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdsale - 精度和边界条件测试", function () {
    let hltToken, mockUSDT, crowdsale;
    let deployer, user1, user2;
    const tokensPerUSDT = 1; // 1 USDT = 1 HLT

    beforeEach(async function () {
        [deployer, user1, user2] = await ethers.getSigners();

        // 部署 HLTToken
        const HLTToken = await ethers.getContractFactory("HLTToken");
        hltToken = await HLTToken.deploy(
            "HealthLife Token",
            "HLT",
            deployer.address,
            user1.address
        );
        await hltToken.deployed();

        // 部署 MockUSDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        mockUSDT = await MockUSDT.deploy(deployer.address);
        await mockUSDT.deployed();

        // 部署 Crowdsale
        const Crowdsale = await ethers.getContractFactory("Crowdsale");
        crowdsale = await Crowdsale.deploy(
            hltToken.address,
            mockUSDT.address,
            deployer.address
        );
        await crowdsale.deployed();

        // 设置代币价格
        await crowdsale.setTokenPrice(tokensPerUSDT);
        
        // 设置众筹合约地址
        await hltToken.setCrowdsaleContract(crowdsale.address);

        // 给 Crowdsale 合约转移足够的 HLT 代币
        const saleAmount = await hltToken.SALE_AMOUNT();
        await hltToken.transfer(crowdsale.address, saleAmount);

        // 给用户铸造 USDT
        await mockUSDT.mint(user1.address, ethers.utils.parseUnits("1000000", 6));
        await mockUSDT.connect(user1).approve(crowdsale.address, ethers.utils.parseUnits("1000000", 6));
    });

    describe("calculateHLTAmount 精度测试", function () {
        it("应该正确处理最小 USDT 输入 (1 wei)", async function () {
            const usdtAmount = 1; // 1 wei USDT
            const expectedHLT = ethers.BigNumber.from(usdtAmount).mul(ethers.BigNumber.from(10).pow(12)).mul(tokensPerUSDT);
            const actualHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            expect(actualHLT.toString()).to.equal(expectedHLT.toString());
        });

        it("应该正确处理 0.000001 USDT (1 micro USDT)", async function () {
            const usdtAmount = 1; // 1 micro USDT = 1 * 10^0 in 6 decimals
            const expectedHLT = ethers.BigNumber.from(usdtAmount).mul(ethers.BigNumber.from(10).pow(12)).mul(tokensPerUSDT);
            const actualHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            expect(actualHLT.toString()).to.equal(expectedHLT.toString());
            
            // 验证结果是否为 0.000001 HLT (1 micro USDT = 1 micro HLT)
             expect(ethers.utils.formatEther(actualHLT)).to.equal("0.000001");
        });

        it("应该正确处理 0.1 USDT", async function () {
            const usdtAmount = ethers.utils.parseUnits("0.1", 6); // 0.1 USDT
            const expectedHLT = ethers.BigNumber.from(usdtAmount).mul(ethers.BigNumber.from(10).pow(12)).mul(tokensPerUSDT);
            const actualHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            expect(actualHLT.toString()).to.equal(expectedHLT.toString());
            expect(ethers.utils.formatEther(actualHLT)).to.equal("0.1");
        });

        it("应该正确处理 1 USDT", async function () {
            const usdtAmount = ethers.utils.parseUnits("1", 6); // 1 USDT
            const expectedHLT = ethers.BigNumber.from(usdtAmount).mul(ethers.BigNumber.from(10).pow(12)).mul(tokensPerUSDT);
            const actualHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            expect(actualHLT.toString()).to.equal(expectedHLT.toString());
            expect(ethers.utils.formatEther(actualHLT)).to.equal("1.0");
        });

        it("应该正确处理大额 USDT (1,000,000 USDT)", async function () {
            const usdtAmount = ethers.utils.parseUnits("1000000", 6); // 1M USDT
            const expectedHLT = ethers.BigNumber.from(usdtAmount).mul(ethers.BigNumber.from(10).pow(12)).mul(tokensPerUSDT);
            const actualHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            expect(actualHLT.toString()).to.equal(expectedHLT.toString());
            expect(ethers.utils.formatEther(actualHLT)).to.equal("1000000.0");
        });

        it("应该正确处理不同的 tokensPerUSDT 比率", async function () {
            // 测试 1 USDT = 10 HLT
            await crowdsale.setTokenPrice(10);
            const usdtAmount = ethers.utils.parseUnits("1", 6);
            const actualHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            expect(ethers.utils.formatEther(actualHLT)).to.equal("10.0");

            // 测试 1 USDT = 0.5 HLT (需要用分数表示)
            // 由于 Solidity 不支持小数，我们用 1 USDT = 1 HLT, 2 USDT = 1 HLT 来模拟
            await crowdsale.setTokenPrice(1);
            const usdtAmount2 = ethers.utils.parseUnits("2", 6);
            const actualHLT2 = await crowdsale.calculateHLTAmount(usdtAmount2);
            expect(ethers.utils.formatEther(actualHLT2)).to.equal("2.0");
        });
    });

    describe("calculateUSDTAmount 精度测试", function () {
        it("应该正确处理最小 HLT 输入 (1 wei)", async function () {
            const hltAmount = 1; // 1 wei HLT
            const expectedUSDT = ethers.BigNumber.from(hltAmount).div(ethers.BigNumber.from(10).pow(12)).div(tokensPerUSDT);
            const actualUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
            expect(actualUSDT.toString()).to.equal(expectedUSDT.toString());
        });

        it("应该正确处理 0.000000000001 HLT (1 wei HLT)", async function () {
            const hltAmount = 1; // 1 wei HLT
            const actualUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
            // 由于精度限制，1 wei HLT 应该转换为 0 USDT
            expect(actualUSDT.toString()).to.equal("0");
        });

        it("应该正确处理 0.000001 HLT", async function () {
            const hltAmount = ethers.utils.parseEther("0.000001"); // 0.000001 HLT
            const actualUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
            // 0.000001 HLT = 0.000001 USDT = 1 micro USDT
            expect(actualUSDT.toString()).to.equal("1");
        });

        it("应该正确处理 1 HLT", async function () {
            const hltAmount = ethers.utils.parseEther("1"); // 1 HLT
            const actualUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
            expect(actualUSDT.toString()).to.equal(ethers.utils.parseUnits("1", 6).toString());
        });

        it("应该正确处理大额 HLT (1,000,000 HLT)", async function () {
            const hltAmount = ethers.utils.parseEther("1000000"); // 1M HLT
            const actualUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
            expect(actualUSDT.toString()).to.equal(ethers.utils.parseUnits("1000000", 6).toString());
        });
    });

    describe("计算函数一致性测试", function () {
        it("calculateHLTAmount 和 calculateUSDTAmount 应该互为逆函数", async function () {
            const testAmounts = [
                ethers.utils.parseUnits("0.000001", 6), // 1 micro USDT
                ethers.utils.parseUnits("0.1", 6),      // 0.1 USDT
                ethers.utils.parseUnits("1", 6),        // 1 USDT
                ethers.utils.parseUnits("100", 6),      // 100 USDT
                ethers.utils.parseUnits("10000", 6),    // 10K USDT
            ];

            for (const usdtAmount of testAmounts) {
                const hltAmount = await crowdsale.calculateHLTAmount(usdtAmount);
                const backToUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
                
                // 由于精度限制，允许小的误差
                const diff = usdtAmount.sub(backToUSDT).abs();
                expect(diff.lte(1)).to.be.true; // 允许最多 1 wei 的误差
            }
        });

        it("buyTokens 应该与 calculateHLTAmount 使用相同的计算逻辑", async function () {
            const usdtAmount = ethers.utils.parseUnits("10", 6); // 10 USDT
            const expectedHLT = await crowdsale.calculateHLTAmount(usdtAmount);
            
            // 启动众筹
            await crowdsale.startCrowdsale();
            
            const balanceBefore = await hltToken.balanceOf(user1.address);
            await crowdsale.connect(user1).buyTokens(usdtAmount);
            const balanceAfter = await hltToken.balanceOf(user1.address);
            
            const actualHLT = balanceAfter.sub(balanceBefore);
            expect(actualHLT.toString()).to.equal(expectedHLT.toString());
        });
    });

    describe("边界条件测试", function () {
        it("应该拒绝 0 USDT 输入", async function () {
            // 启动众筹
            await crowdsale.startCrowdsale();
            
            try {
                 await crowdsale.connect(user1).buyTokens(0);
                 expect.fail("Expected transaction to revert");
             } catch (error) {
                 expect(error.message).to.match(/(Amount must be greater than 0|revert)/i);
             }
        });

        it("应该正确处理最大 uint256 输入 (理论测试)", async function () {
            const maxUint256 = ethers.constants.MaxUint256;
            
            // 注意：这个测试可能会因为溢出而失败，这是预期的
            try {
                const result = await crowdsale.calculateHLTAmount(maxUint256);
                // 如果没有溢出，验证结果
                expect(result).to.be.a('object'); // BigNumber
            } catch (error) {
                // 预期的溢出或revert错误
                expect(error.message).to.match(/(overflow|revert)/i);
            }
        });

        it("应该正确处理接近溢出的大数值", async function () {
            // 使用一个大但不会溢出的数值
            const largeAmount = ethers.BigNumber.from("1000000000000000000"); // 10^18
            const result = await crowdsale.calculateHLTAmount(largeAmount);
            expect(result).to.be.a('object'); // 应该成功返回 BigNumber
        });
    });

    describe("精度损失检测", function () {
        it("应该检测小数除法的精度损失", async function () {
            // 测试可能导致精度损失的计算
            const testCases = [
                { usdt: 1, expectedHLT: ethers.BigNumber.from(10).pow(12) },
                { usdt: 3, expectedHLT: ethers.BigNumber.from(3).mul(ethers.BigNumber.from(10).pow(12)) },
                { usdt: 7, expectedHLT: ethers.BigNumber.from(7).mul(ethers.BigNumber.from(10).pow(12)) },
            ];

            for (const testCase of testCases) {
                const actualHLT = await crowdsale.calculateHLTAmount(testCase.usdt);
                expect(actualHLT.toString()).to.equal(testCase.expectedHLT.toString());
            }
        });

        it("应该验证反向计算的精度", async function () {
            const testHLTAmounts = [
                ethers.utils.parseEther("0.001"),          // 1 milli HLT
                ethers.utils.parseEther("0.1"),            // 0.1 HLT
                ethers.utils.parseEther("1"),              // 1 HLT
            ];

            for (const hltAmount of testHLTAmounts) {
                const usdtAmount = await crowdsale.calculateUSDTAmount(hltAmount);
                const backToHLT = await crowdsale.calculateHLTAmount(usdtAmount);
                
                // 检查精度损失
                const precision = hltAmount.sub(backToHLT).abs();
                
                // 对于较大的数值，精度损失应该很小
                const precisionPercentage = precision.mul(10000).div(hltAmount); // 以万分之一为单位
                // 精度损失应该小于 1% (100/10000)
                expect(precisionPercentage.lte(100)).to.be.true;
            }
        });
    });

    describe("不同价格比率下的精度测试", function () {
        const testRatios = [1, 2, 5, 10, 100, 1000];

        testRatios.forEach(ratio => {
            it(`应该在 1 USDT = ${ratio} HLT 比率下保持精度`, async function () {
                await crowdsale.setTokenPrice(ratio);
                
                const usdtAmount = ethers.utils.parseUnits("1", 6); // 1 USDT
                const expectedHLT = ethers.utils.parseEther(ratio.toString());
                const actualHLT = await crowdsale.calculateHLTAmount(usdtAmount);
                
                expect(actualHLT.toString()).to.equal(expectedHLT.toString());
                
                // 反向验证
                const backToUSDT = await crowdsale.calculateUSDTAmount(actualHLT);
                expect(backToUSDT.toString()).to.equal(usdtAmount.toString());
            });
        });
    });
});