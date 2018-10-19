const { ether } = require("./helpers/ether");

const chai = require("chai");
const BN = require("bn.js");
const bnChai = require("bn-chai");
const expect = chai.expect;
chai.use(bnChai(BN));

const { ZERO_ADDRESS } = require("./helpers/constants");
const abiDecoder = require("abi-decoder");

const SimpleToken = artifacts.require("SimpleToken");
const SimpleCrowdsale = artifacts.require("SimpleCrowdsale");

contract(
  "SimpleCrowdsale",
  ([_, deployer, owner, wallet, investor01, investor02]) => {
    beforeEach(async () => {
      // Token config
      this.name = "SimpleToken";
      this.symbol = "MTT";
      this.decimals = 18;

      // Token deployment
      this.token = await SimpleToken.new(
        this.name,
        this.symbol,
        this.decimals,
        {
          from: deployer
        }
      );
      this.totalSupply = await this.token.totalSupply();
      this.creatorBalance = await this.token.balanceOf(deployer);
      const receipt = await web3.eth.getTransactionReceipt(
        this.token.transactionHash
      );
      abiDecoder.addABI(this.token.abi);
      this.logs = abiDecoder.decodeLogs(receipt.logs);

      // Crowdsale config
      this.rate = 500;
      this.wallet = wallet;

      // Crowdsale deployment
      this.crowdsale = await SimpleCrowdsale.new(
        this.rate,
        this.wallet,
        this.token.address,
        { from: owner }
      );

      // Transfer all tokens to the crowdsale contract
      const deployerbalance = await this.token.balanceOf(deployer);
      const crowdsalebalance = await web3.eth.getBalance(
        this.crowdsale.address
      );
      const tokenaddressbalance = await this.token.balanceOf(
        this.token.address
      );
      const ownerbalance = await this.token.balanceOf(owner);
      const crowdsalewallet = await this.crowdsale.wallet();
      const crowdsalewalletBalance = await web3.eth.getBalance(crowdsalewallet);
      const crowdsalewalletBalanceToken = await this.token.balanceOf(
        crowdsalewallet
      );

      console.log("address - deployer: %o", deployer);
      console.log("address - owner: %o", owner);
      console.log("address - token contract: %o", this.token.address);
      console.log("address - crowdsale contract: %o", this.crowdsale.address);
      console.log("address - crowdsale wallet: %o", crowdsalewallet);

      console.log(
        "balance before transfer - token address: %o",
        web3.utils.fromWei(tokenaddressbalance.toString(), "ether")
      );
      console.log(
        "balance before transfer - deployer: %o",
        web3.utils.fromWei(deployerbalance.toString(), "ether")
      );
      console.log(
        "balance before transfer - owner: %o",
        web3.utils.fromWei(ownerbalance.toString(), "ether")
      );
      console.log(
        "balance before transfer - crowdsale address: %o",
        crowdsalebalance
      );
      console.log(
        "balance before transfer - crowdsale wallet ETH: %o",
        web3.utils.fromWei(crowdsalewalletBalance.toString(), "ether")
      );
      console.log(
        "balance before transfer - crowdsale wallet token: %o",
        web3.utils.fromWei(crowdsalewalletBalanceToken.toString(), "ether")
      );

      await this.token.approve(owner, "188400000000000000000", {
        from: deployer
      });

      await this.token.transferFrom(
        deployer,
        this.crowdsale.address,
        1800000000000000000,
        { from: owner }
      );

      const allowedAccount = await this.token.allowance(deployer, owner);
      console.log(
        "allowed accounts: %o",
        web3.utils.fromWei(allowedAccount.toString(), "ether")
      );

      var deployerbalanceafter = await this.token.balanceOf(deployer);
      var crowdsalebalanceafterETH = await web3.eth.getBalance(
        this.crowdsale.address
      );
      var crowdsalebalanceafterToken = await this.token.balanceOf(
        this.crowdsale.address
      );
      var tokenaddressbalanceafter = await this.token.balanceOf(
        this.token.address
      );
      var ownerbalanceafter = await this.token.balanceOf(owner);
      var crowdsalewalletBalanceAfter = await web3.eth.getBalance(
        crowdsalewallet
      );

      tokenaddressbalanceafter = console.log(
        "balance after transfer - token address: %o",
        web3.utils.fromWei(tokenaddressbalanceafter.toString(), "ether")
      );
      console.log(
        "balance after transfer - deployer: %o",
        web3.utils.fromWei(deployerbalanceafter.toString(), "ether")
      );
      console.log(
        "balance after transfer - owner: %o",
        web3.utils.fromWei(ownerbalanceafter.toString(), "ether")
      );
      console.log(
        "balance after transfer - crowdsale address ETH: %o",
        web3.utils.fromWei(crowdsalebalanceafterETH.toString(), "ether")
      );
      console.log(
        "balance after transfer - crowdsale address Token: %o",
        web3.utils.fromWei(crowdsalebalanceafterToken.toString(), "ether")
      );
      console.log(
        "balance after transfer - crowdsale wallet ETH: %o",
        web3.utils.fromWei(crowdsalewalletBalanceAfter.toString(), "ether")
      );
    });

    describe("simple crowdsale attributes", () => {
      it("crowdsale has the correct rate", async () => {
        const rate = await this.crowdsale.rate();
        expect(rate).to.eq.BN(this.rate);
      });

      it("crowdsale has the correct wallet", async () => {
        const wallet = await this.crowdsale.wallet();
        expect(wallet).to.eql(this.wallet);
      });

      it("crowdsale has the correct token", async () => {
        const token = await this.crowdsale.token();
        expect(token).to.eql(this.token.address);
      });
    });

    describe("assigns the initial total supply to the creator", () => {
      it("assigns the initial total supply to the creator", async () => {
        expect(this.creatorBalance.eq(this.totalSupply)).to.be.true;
      });

      it("log has length 1", async () => {
        expect(this.logs.length).to.eql(1);
      });

      it("the transaction type is Transfer", async () => {
        expect(this.logs[0].name).to.eql("Transfer");
      });

      it("the transaction is initited from zero_address", async () => {
        expect(this.logs[0].events[0].value).to.eql(ZERO_ADDRESS);
      });

      it("tokens are transferred to deployer", async () => {
        expect(this.logs[0].events[1].value.toLowerCase()).to.eql(
          deployer.toLowerCase()
        );
      });

      it("all supply of tokens is transferred", async () => {
        expect(this.totalSupply).to.eq.BN(this.logs[0].events[2].value);
      });
    });

    describe("accepting payments", () => {
      it("should accept payments", async () => {
        const investAmount = ether("1");
        //const expectedTokenAmount = this.rate * investAmount;
        //console.log(expectedTokenAmount);
        await this.crowdsale.buyTokens(investor01, {
          value: investAmount,
          from: investor01
        });
      });
    });
  }
);
