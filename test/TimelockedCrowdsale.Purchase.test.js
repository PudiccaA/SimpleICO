const { ether } = require("./helpers/ether");
const time = require("./helpers/time");
const { advanceBlock } = require("./helpers/advanceToBlock");
const { ethGetBlock } = require("./helpers/web3");

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const BN = require("bn.js");
const bnChai = require("bn-chai");
const expect = chai.expect;
chai.use(bnChai(BN));
chai.use(chaiAsPromised);
chai.should();

const { ZERO_ADDRESS } = require("./helpers/constants");
const abiDecoder = require("abi-decoder");

const SPToken = artifacts.require("SPToken");
const SPGToken = artifacts.require("SPGToken");
const TimelockedCrowdsale = artifacts.require("TimelockedCrowdsale");

const TokenVesting = artifacts.require("TokenVesting");

contract("TimelockedCrowdsale", accounts => {
  let deployer, wallet, investor01, investor02, investor03;

  [deployer, wallet, investor01, investor02, investor03] = accounts;

  let _rate, _wallet, _cap, _openingTime, _closingTime;
  let _start, _cliffDuration, _duration, _revocable;
  let afterClosingTime, investAmount, expectedTokenAmount;
  let beneficiaryLocks, beneficiaryLock;

  before(async () => {
    await advanceBlock();
  });

  beforeEach(async () => {
    // Create and deploy contracts
    spt = await SPToken.new();
    sptg = await SPGToken.new();

    // Crowdsale config
    _rate = 4000;
    _wallet = wallet;
    _cap = ether("62500");
    contributionMin = ether("0.002");
    contributionMax = ether("50");
    _tokenVault = deployer;
    _openingTime = (await time.latest()) + time.duration.weeks(1);
    _closingTime = _openingTime + time.duration.weeks(1);
    _start = (await time.latest()) + time.duration.minutes(1);
    _cliffDuration = time.duration.weeks(4);
    _duration = time.duration.weeks(12);
    _revocable = true;

    // Crowdsale deployment
    sender = await TimelockedCrowdsale.new(
      _rate,
      _wallet,
      spt.address,
      _cap,
      _tokenVault,
      _openingTime,
      _closingTime,
      _start,
      _cliffDuration,
      _duration,
      _revocable
    );

    // Set token purchase parameters for tests
    investAmount = ether("1");
    expectedTokenAmount = (await sender.rate()) * investAmount;
    afterClosingTime = _closingTime + time.duration.seconds(1);

    // approve crowdsale contract to spend token spt
    await spt.approve(sender.address, await spt.totalSupply(), {
      from: deployer
    });

    await time.increaseTo(_openingTime);

    await sender.buyTokens(investor01, {
      value: investAmount,
      from: investor01
    });

    [beneficiaryLocks] = await sender.getTokenLocks();
    beneficiaryLock = await TokenVesting.at(beneficiaryLocks);
  });

  describe("accepting payments", () => {
    it("can get state", async () => {
      expect(await beneficiaryLock.beneficiary()).to.eql(investor01);
      expect(await beneficiaryLock.cliff()).to.eq.BN(_start + _cliffDuration);
      expect(await beneficiaryLock.start()).to.eq.BN(_start);
      expect(await beneficiaryLock.duration()).to.eq.BN(_duration);
      expect(await beneficiaryLock.revocable()).to.be.true;
    });

    it("locked correct amount before release", async function() {
      const amountInLock = await spt.balanceOf(beneficiaryLock.address);
      var deliveredToLock = investAmount * _rate;
      deliveredToLock = await web3.utils.fromWei(
        deliveredToLock.toString(),
        "ether"
      );
      expect(await web3.utils.fromWei(amountInLock), "ether").to.eq.BN(
        deliveredToLock
      );
    });

    it("cannot be released before cliff", async function() {
      await beneficiaryLock.release(spt.address).should.be.rejected;
    });

    it("can be released after cliff", async function() {
      await time.increaseTo(_start + _cliffDuration + time.duration.weeks(1));
      const { logs } = await beneficiaryLock.release(spt.address);
      expect(logs[0].args.amount).to.eq.BN(await spt.balanceOf(investor01));
    });

    it("should release proper amount after cliff", async function() {
      await time.increaseTo(_start + _cliffDuration);

      const investorBalanceBefore = await spt.balanceOf(investor01);
      /*console.log(
        "Amount of spt on investor's account before release: %o",
        await web3.utils.fromWei(investorBalanceBefore, "ether")
      );*/

      const amountInLockBefore = await spt.balanceOf(beneficiaryLock.address);
      /*console.log(
        "Amount of spt locked before release:                %o",
        await web3.utils.fromWei(amountInLockBefore, "ether")
      );*/

      const releasableSpt = await beneficiaryLock.releasableAmount(spt.address);
      /*console.log(
        "Amount of spt releasable:                           %o",
        await web3.utils.fromWei(releasableSpt, "ether")
      );*/

      const vestedSpt = await beneficiaryLock.vestedAmount(spt.address);
      /*console.log(
        "Amount of spt already vested:                       %o",
        await web3.utils.fromWei(vestedSpt, "ether")
      );*/

      const { receipt } = await beneficiaryLock.release(spt.address);
      const block = await ethGetBlock(receipt.blockNumber);
      const releaseTime = block.timestamp;

      const amountInLock = await spt.balanceOf(beneficiaryLock.address);
      /*console.log(
        "Amount of spt locked:                               %o",
        await web3.utils.fromWei(amountInLock, "ether")
      );*/

      const releasedAmount = amountInLockBefore
        .mul(new BN(releaseTime - _start))
        .div(new BN(_duration));

      /*console.log(
        "Amount of spt supposed to be released:              %o",
        await web3.utils.fromWei(releasedAmount, "ether")
      );*/
      const investorBalanceAfter = await spt.balanceOf(investor01);
      /*console.log(
        "Amount of spt on investor's account after release:  %o",
        await web3.utils.fromWei(investorBalanceAfter, "ether")
      );*/
      expect(await spt.balanceOf(investor01)).to.eq.BN(releasedAmount);
      expect(await beneficiaryLock.released(spt.address)).to.eq.BN(
        releasedAmount
      );
    });

    it("should linearly release tokens during vesting period", async function() {
      const vestingPeriod = _duration - _cliffDuration;
      const checkpoints = 4;
      const amountInLockBefore = await spt.balanceOf(beneficiaryLock.address);

      for (let i = 1; i <= checkpoints; i++) {
        const now = _start + _cliffDuration + i * (vestingPeriod / checkpoints);
        await time.increaseTo(now);

        await beneficiaryLock.release(spt.address);
        const expectedVesting = amountInLockBefore
          .mul(new BN(now - _start))
          .div(new BN(_duration));

        expect(await spt.balanceOf(investor01)).to.eq.BN(expectedVesting);
        expect(await beneficiaryLock.released(spt.address)).to.eq.BN(
          expectedVesting
        );
      }
    });

    it("should have released all after end", async function() {
      await time.increaseTo(_start + _duration);
      await beneficiaryLock.release(spt.address);
      expect(await spt.balanceOf(investor01)).to.eq.BN(
        expectedTokenAmount.toString()
      );
      expect(await beneficiaryLock.released(spt.address)).to.eq.BN(
        expectedTokenAmount.toString()
      );
    });

    it("lock ownership is transfered to deployer of crowdsale contract", async function() {
      expect(await beneficiaryLock.owner()).to.be.eql(deployer);
    });

    it("should be revoked by owner if revocable is set", async function() {
      const { logs } = await beneficiaryLock.revoke(spt.address, {
        from: deployer
      });
      expect(logs[0].event).to.be.eql("Revoked");
      expect(await beneficiaryLock.revoked(spt.address)).to.be.true;
    });

    it("should return the non-vested tokens when revoked by owner", async function() {
      await time.increaseTo(_start + _cliffDuration + time.duration.weeks(2));

      const ownerBalanceBeforeRevoke = await spt.balanceOf(deployer);
      const vested = await beneficiaryLock.vestedAmount(spt.address);
      const expectedTokenAmountBN = new BN(expectedTokenAmount.toString());

      await beneficiaryLock.revoke(spt.address, { from: deployer });

      expect(await spt.balanceOf(deployer)).to.eq.BN(
        new BN(ownerBalanceBeforeRevoke).add(expectedTokenAmountBN.sub(vested))
      );
    });

    it("should keep the vested tokens when revoked by owner", async function() {
      await time.increaseTo(_start + _cliffDuration + time.duration.weeks(2));

      const vestedPre = await beneficiaryLock.vestedAmount(spt.address);

      await beneficiaryLock.revoke(spt.address, { from: deployer });

      const vestedPost = await beneficiaryLock.vestedAmount(spt.address);

      expect(vestedPre).to.eq.BN(vestedPost);
    });

    it("should fail to be revoked a second time", async function() {
      await beneficiaryLock.revoke(spt.address, { from: deployer });
      await beneficiaryLock.revoke(spt.address, { from: deployer }).should.be
        .rejected;
    });
  });
});
