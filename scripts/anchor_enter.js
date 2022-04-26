const { ethers, deployments } = require("hardhat");
const hre = require("hardhat");
// const {deployments, ethers} = hre;
const Multicall = require("@0xsequence/multicall");
// const Table = require('cli-table');

const sleep = (n) => new Promise((res, rej) => setTimeout(res, n));

(async () => {
  try {
    const accounts = await ethers.getSigners();
    const xINV = await deployments.get("XINV");
    const oracle = await deployments.get("Oracle");
    const { deployer, weth, deployer2 } = await getNamedAccounts();

    let comptrollerDeployment = await deployments.get("Comptroller");
    comptrollerDeployment.address = (
      await deployments.get("Unitroller")
    ).address;

    const provider = new Multicall.providers.MulticallProvider(
      ethers.provider,
      { batchSize: 1000000 }
    );

    const comptroller = new ethers.Contract(
      comptrollerDeployment.address,
      comptrollerDeployment.abi,
      provider
    );


    // eth -> weth 100
    // lend weth
    // borrow inv
    // liquidate some assert

    // console.log('anETH', (await deployments.get("anETH")).address)
    console.log("address: ", accounts[0].address);
    const Oracle = new ethers.Contract(oracle.address, oracle.abi, provider);
    const anETH = await deployments.get("anETH");
    const anDola = await deployments.get("anDola");
    const Cether = new ethers.Contract(anETH.address, anETH.abi, provider);
    const Cdola = new ethers.Contract(anDola.address, anDola.abi, provider);

    // console.log('cash: ', await Cether.getCashPrior())

    const lend100ether = await Cether.connect(accounts[0]).mint({
      value: ethers.utils.parseEther("100"),
    });

    const receipt_lend100ether = await lend100ether.wait();
    //console.log("receipt_lend100ether:", receipt_lend100ether);

    let error, liquidity, shortfall;
    ({ 0: error, 1: liquidity, 2: shortfall } ==
      (await comptroller.getAccountLiquidity(accounts[0].address)));
    console.log("liquidity:", liquidity);

    await comptroller.connect(accounts[0]).enterMarkets([anETH.address]);

    ({
      0: error,
      1: liquidity,
      2: shortfall,
    } = await comptroller.getAccountLiquidity(accounts[0].address));
    console.log("liquidity2:", liquidity);

    // deploy2 should unock.
    const unlock_cdola = await comptroller
      .connect(deployer2)
      ._setBorrowPaused(anDola.address, false, {
        gasPrice: await provider.getGasPrice(),
        gasLimit: 1000000,
      });
    const receipt_unlock = await unlock_cdola.wait();
    console.log("receipt_unlock:", receipt_unlock.transactionHash);

    const borrow = await Cdola.connect(accounts[0]).borrow(liquidity);

    const receipt_borrow = await borrow.wait();
    console.log("borrow:", receipt_borrow.transactionHash);


    //
    console.log(
      "inv price: ",
      (await Oracle.getUnderlyingPrice(xINV.address)) / Math.pow(10, 18)
    );

    //swap eth  -> inv  0x328dFd0139e26cB0FEF7B0742B49b0fe4325F821
    const slp_address = "0x328dFd0139e26cB0FEF7B0742B49b0fe4325F821";
    const sushi_router = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
    const uniswapV2Pair = new ethers.Contract(
      slp_address,
      require("@uniswap/v2-core/build/UniswapV2Pair.json").abi,
      provider
    );
    const router = new ethers.Contract(
      sushi_router,
      require("@uniswap/v2-periphery/build/IUniswapV2Router02.json").abi,
      provider
    );

    const INV = "0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68";
    console.log("INV: ", INV, "weth:", weth);

  } catch (e) {
    console.error(e);
  }
})();
