const PREFIX = "Returned error: VM Exception while processing transaction: ";

async function tryCatch(promise, message) {
    try {
        await promise;
        throw null;
    }
    catch (error) {
        assert(error, "Expected an error but did not get one");
        assert(error.message.startsWith(PREFIX + message), "Expected an error starting with '" + PREFIX + message + "' but got '" + error.message + "' instead");
    }
};

module.exports = {
    catchRevert_ERC721PresetMinterPauser_pause   : async function(promise) {await tryCatch(promise, "revert ERC721PresetMinterPauser: must have pauser role to pause");},
    catchRevert_ERC721PresetMinterPauser_unpause : async function(promise) {await tryCatch(promise, "revert ERC721PresetMinterPauser: must have pauser role to unpause");},
    catchRevert_ERC721Pausable_paused            : async function(promise) {await tryCatch(promise, "revert ERC721Pausable: token transfer while paused");},
    //
    catchRevert            : async function(promise) {await tryCatch(promise, "revert"             );},
    catchOwnable           : async function(promise) {await tryCatch(promise, "revert Ownable: caller is not the owner");},
    catchOutOfGas          : async function(promise) {await tryCatch(promise, "out of gas"         );},
    catchInvalidJump       : async function(promise) {await tryCatch(promise, "invalid JUMP"       );},
    catchInvalidOpcode     : async function(promise) {await tryCatch(promise, "invalid opcode"     );},
    catchStackOverflow     : async function(promise) {await tryCatch(promise, "stack overflow"     );},
    catchStackUnderflow    : async function(promise) {await tryCatch(promise, "stack underflow"    );},
    catchStaticStateChange : async function(promise) {await tryCatch(promise, "static state change");},
};
