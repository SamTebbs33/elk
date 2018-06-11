var parser = require("./parser.js");
var templates = require("./templates.js");
var nodes = require("./nodes.js");

function exp(val, name) {
    if (!name) name = val.name;
    module.exports[name] = val;
}

function makeResult(errored, errData, successData) {
    if(!successData) successData = null;
    return { errored: errored, errData: errData, data: successData };
}

function parse(content) {
    var result = parser.statements.parse(content);
    if(!result.status) return makeResult(true, { location: result.index, expected: result.expected });
    return makeResult(false, null, result.value);
}

function compile(content, data = {}, indent = 0) {
    var result = parse(content);
    if (!result.errored) result = generate(result.data, indent, data);
    return result
}
exp(compile);

function generate(parseTree, indent, data) {
    if (!indent) indent = 0;
    if (!data) data = {};
    templates.pushDataContext(data);
    try {
        var res = makeResult(false, null, nodes.genBody(parseTree, indent));
        templates.popDataContext();
        return res;
    } catch (err) {
        templates.popDataContext();
        if (err instanceof String) return makeResult(true, err, null);
        else throw err
    }
}

try {
    if (window) window.elk = module.exports
} catch (e) {
    // Catch window reference error
}