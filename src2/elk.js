var parser = require("./parser.js");
var common = require("./common.js");

function exp(val, name) {
    return common.exp(val, name);
}

function makeResult(errored, errData, successData) {
    if(!successData) successData = null
    return { errored: errored, errData: errData, data: successData }
}

function parse(content) {
    var result = parser.statements.parse(content)
    if(!result.status) return makeResult(true, { location: result.index, expected: result.expected })
    return makeResult(false, null, result.value)
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
    pushDataContext(data);
    try {
        var res = makeResult(false, null, parseTree.gen(indent))
        popDataContext();
        return res
    } catch (err) {
        popDataContext();
        if (err instanceof ElkError) return makeResult(true, err.msg, null)
        else throw err
    }
}

try {
    if (window) window.elk = module.exports
} catch (e) {
    // Catch window reference error
}