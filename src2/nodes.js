const values = require("./values.js");
const common = require("./common.js");

const hrefTags = ["a", "link"];
const voidTags = ["area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr"];

class Node {
    gen(indent) {
        throw "Unimplemented gen()";
    }
}

class StatementNode extends Node {
    constructor(m) {
        super();
        this._metadata = m;
    }

    get metadata() {
        return this._metadata;
    }
}