const MintyPreset = artifacts.require("MintyPreset");
const truffleAssert = require('truffle-assertions');
const { catchRevert_ERC721Pausable_paused } = require("../src/utils/exceptions");

contract("MintyPreset", function (accounts) {

  let minty;
  let tokenId;

  before(async function () {
    minty = await MintyPreset.deployed();
    // return assert.isTrue(true);
  });

  it("can mint", async function () {
    let result = await minty.mint(accounts[0]);
    assert.equal((await minty.balanceOf(accounts[0])).toString(), 1, "does not mint");  
    result = await minty.mintToken(accounts[0], "");
    assert.equal((await minty.balanceOf(accounts[0])).toString(), 2, "does not mint token");
    truffleAssert.eventEmitted(result, 'Transfer', (ev) => {
      tokenId = ev.tokenId.toString();
      return true;
    }, "does not fire transfer event");
  })

  it("can pause & unpause", async function () {
    let result = await minty.pause();
    truffleAssert.eventEmitted(result, 'Paused', (ev) => {return true;}, "does not fire pause event");
    await catchRevert_ERC721Pausable_paused(minty.mint(accounts[0]));
    result = await minty.unpause();
    truffleAssert.eventEmitted(result, 'Unpaused', (ev) => {return true;}, "does not fire unpause event");
  })
  
  it("can transfer", async function () {
    const startingBalanceFrom = (await minty.balanceOf(accounts[0])).toString();
    const startingBalanceTo = (await minty.balanceOf(accounts[1])).toString();
    await minty.transferFrom(accounts[0], accounts[1], tokenId);
    assert.equal((await minty.balanceOf(accounts[0])).toString(), parseInt(startingBalanceFrom)-1, "does not transfer out");
    assert.equal((await minty.balanceOf(accounts[1])).toString(), parseInt(startingBalanceTo)+1, "does not transfer in");
  })

  // token to be burned has been transfered to 2nd account
  it("can burn", async function () {
    const startingBalance = (await minty.balanceOf(accounts[1])).toString();
    await minty.burn(tokenId, {'from':accounts[1]});
    assert.equal((await minty.balanceOf(accounts[1])).toString(), parseInt(startingBalance)-1, "does not burn");
  })

});
