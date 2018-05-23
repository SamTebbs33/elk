var P = require("parsimmon");
var common = require("./common.js");

function exp(val, name) {
    return common.exp(val, name);
}

const whitespace = P.regexp(/\s*/m)

function token(parser) {
    return whitespace.then(parser.skip(whitespace));
}


