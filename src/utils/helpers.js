// const fs = require('fs');
const fs = require('fs/promises');

// ---- helpers

const colorizeOptions = {
    pretty: true,
    colors: {
        STRING_KEY: 'blue.bold',
        STRING_LITERAL: 'green'
    }
};

function alignOutput(labelValuePairs) {
    const maxLabelLength = labelValuePairs
      .map(([l, _]) => l.length)
      .reduce((len, max) => len > max ? len : max);
    for (const [label, value] of labelValuePairs) {
        console.log(label.padEnd(maxLabelLength+1), value);
    }
}

function fileExists(path) {
    // console.debug(path);
    // try {
    //     await fs.access(path, fs.F_OK);
    //     return true;
    // } catch (e) {
    //     return false;
    // }
    return fs.access(path, fs.F_OK, (err) => {
        if (err) {
            console.log(e);
            return false;
        }
        return true;
    });
}

function parseRecipient(value) {
         // get the address of the token owner from options, or use the default signing address if no owner is given
        // let ownerAddress = options.to || options.owner || options.recipient;
        // if (!ownerAddress) ownerAddress = await this.defaultOwnerAddress();
        
}


// ensure value is an 0x address
function parseAddress(value) {
    if (!ethers.utils.isAddress(value))
        throw new commander.InvalidArgumentError('Not an ETH address.');
    return value;
}

// ensure value is a date value that equates to a unix timestamp
function parseDate(value) {
    if (!isValidDate(value))
        throw new commander.InvalidArgumentError('Not a date.');
    return value;
}

// https://stackoverflow.com/questions/6177975/how-to-validate-date-with-format-mm-dd-yyyy-in-javascript
function isValidDate(dateString) {
    // First check for the pattern
    if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString))
        return false;

    // Parse the date parts to integers
    var parts = dateString.split("/");
    var day = parseInt(parts[1], 10);
    var month = parseInt(parts[0], 10);
    var year = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if(year < 1000 || year > 3000 || month == 0 || month > 12)
        return false;

    var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

    // Adjust for leap years
    if(year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;

    // Check the range of the day
    return day > 0 && day <= monthLength[month - 1];
}

module.exports = {
    alignOutput,
    colorizeOptions,
    fileExists,
    parseAddress,
    parseDate
}