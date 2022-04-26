const { ethers, deployments } = require("hardhat");
// const {deployments, ethers} = hre;
const Multicall = require("@0xsequence/multicall");
// const Table = require('cli-table');

const sleep = (n) => new Promise((res, rej) => setTimeout(res, n));

(async () => {
  try {
    const accounts = await ethers.getSigners();
    const xINV = await deployments.get("XINV");
    const oracle = await deployments.get("Oracle");
    const { deployer, weth } = await getNamedAccounts();

    // let comptrollerDeployment = await deployments.get("Comptroller")
    // comptrollerDeployment.address = (await deployments.get("Unitroller")).address
    const provider = new Multicall.providers.MulticallProvider(
      ethers.provider,
      { batchSize: 1000000 }
    );
    const Oracle = new ethers.Contract(oracle.address, oracle.abi, provider);
    // const filter = comptroller.filters.MarketEntered();
    // const logs = await comptroller.queryFilter(filter, 0, "latest");
    // let accounts = [...new Set(logs.map(v=>v.args.account))]
    // const promises = accounts.map(v => comptroller.getAccountLiquidity(v))
    // const accountsLiquidity = await Promise.all(promises)
    // var positionTable = new Table({
    //     head: ['Address', 'Liquidity', 'Shortfall', 'Liquidatable']
    // });
    // let positions = accounts.map((v,i) => [v, accountsLiquidity[i][1], accountsLiquidity[i][2], accountsLiquidity[i][2].gt(0)])
    // positions = positions.filter((v) => v[1].gt(0) || v[2].gt(0))
    // positions = positions.map(v => [v[0], ethers.utils.formatEther(v[1]), ethers.utils.formatEther(v[2]), v[3]])
    // positions = positions.sort((a, b) => Number(b[1]) - Number(a[1]));
    // positionTable.push(...positions)
    //
    // console.log("Positions:")
    // console.log(positionTable.toString());
    //
    // var liquidatableTable = new Table({
    //     head: ['Address', 'Liquidity', 'Shortfall', 'Liquidatable']
    // });
    //
    // const liquidatable = positions.filter(v => v[3] === true)
    // liquidatableTable.push(...liquidatable)
    // console.log('Oracle address: ', oracle);
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
    const amountIn = ethers.utils.parseEther("300");
    console.log("amountIn:", amountIn);
    const factory = await router.factory();
    console.log("factory:", factory);
    const amountsOut = await router.getAmountsOut(amountIn, [weth, INV]);
    console.log("amountsOut:", amountsOut[1] / Math.pow(10, 18));

    const Keep3rV2Oracle = await hre.ethers.getContractFactory(
      "Keep3rV2Oracle"
    );
    const keep3rV2Oracle = await Keep3rV2Oracle.deploy(slp_address);

    await keep3rV2Oracle.deployed();
    console.log("keep3rV2Oracle deployed to:", keep3rV2Oracle.address);

    const update = await keep3rV2Oracle.update();
    const receiptupdate = await update.wait();
    console.log("update receipt", receiptupdate.blockNumber);

    console.log("l: ", await keep3rV2Oracle.length());
    console.log("o: ", await keep3rV2Oracle.observations(0));

    console.log("slp timestamp:", await uniswapV2Pair.getReserves());

    const amountOutMin = "0";

    const deadline = Date.now() + 1000 * 60;
    console.log("gas price:", (await provider.getGasPrice()) / 1e9, "G");
    console.log("gaccounts[0]:", accounts[0].address);

    const tx = await router
      .connect(accounts[0])
      .swapExactETHForTokens(
        amountOutMin,
        [weth, INV],
        accounts[0].address,
        deadline,
        {
          gasPrice: await provider.getGasPrice(),
          gasLimit: 1000000,
          value: amountIn,
        }
      );

    const receipt = await tx.wait();
    console.log("buyToken receipt");

    const current2 = await keep3rV2Oracle.current(
      INV,
      ethers.utils.parseEther("1"),
      weth
    );
    console.log("current", (current2.amountOut / 1e18) * 3000);

    await sleep(30000);

    console.log("slp timestamp2:", await uniswapV2Pair.getReserves());
    let current = await keep3rV2Oracle.current(
      INV,
      ethers.utils.parseEther("1"),
      weth
    );
    console.log("current", (current.amountOut / 1e18) * 3000);

    await sleep(15000);

    console.log("slp timestamp2:", await uniswapV2Pair.getReserves());
    current = await keep3rV2Oracle.current(
      INV,
      ethers.utils.parseEther("1"),
      weth
    );
    console.log("current", (current.amountOut / 1e18) * 3000);

    await sleep(15000);

    console.log("slp timestamp2:", await uniswapV2Pair.getReserves());
    current = await keep3rV2Oracle.current(
      INV,
      ethers.utils.parseEther("1"),
      weth
    );
    console.log("current", (current.amountOut / 1e18) * 3000);

    console.log(
      "inv price2: ",
      (await Oracle.getUnderlyingPrice(xINV.address)) / Math.pow(10, 18)
    );
  } catch (e) {
    console.error(e);
  }
})();
