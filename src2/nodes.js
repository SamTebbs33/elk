const values = require("./values.js");
var sprintf = require('sprintf-js').sprintf;

function exp(val, name) {
    if (!name) name = val.name;
    module.exports[name] = val
}

const hrefTags = ["a", "link"];
const voidTags = ["area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr"];

function genBody(body, indent) {
    const empty = !body || body.length === 0;
    const simpleBody = !empty && body.length === 0 && body[0].isSimple();
    if(empty) return "";
    else if(simpleBody) {
        return body[0].gen(0);
    } else {
        const genResult = body.map(stmt => stmt.gen(indent)).join("\n");
        return "\n" + genResult + "\n";
    }
}
exp(genBody);

function repeat(str, times) {
    var s = "";
    for (let i = 0; i < times; i++) {
        s += str;
    }
    return s;
}

function makeIndentation(indent) {
    return repeat("\t", indent)
}

class Node {
    gen(indent) {
        throw "Unimplemented gen()";
    }

    isSimple() {
        return false;
    }
}

class Expression extends Node {
    constructor() {
        super();
    }

    eval() {
        throw "Unimplemented eval()";
    }

    gen(indent) {
        return makeIndentation(indent) + this.eval().toString();
    }
}

class TagNode extends Node {
    constructor(t, m, b) {
        super();
        this._metadata = m;
        this._tag = t;
        this._body = b;
        this.metadata.tag = this.tag;
    }

    get metadata() {
        return this._metadata;
    }

    get tag() {
        return this._tag;
    }

    get body() {
        return this._body;
    }

    gen(indent) {
        const indentation = makeIndentation(indent);
        const metadataGen = this.metadata.gen(0);
        return sprintf("%s<%s%s>%s<%s>", indentation, this.tag, metadataGen === "" ? "" : " " + metadataGen, genBody(this.body, indent), this.tag);
    }
}
exp(TagNode);

class DataAssignmentNode extends Node {
    constructor(variable, expr) {
        super();
        this._var = variable;
        this._expr = expr;
    }

    get variable() {
        return this._var;
    }

    get expression() {
        return this._expr;
    }

    gen(indent) {
        // TODO
        return "";
    }
}
exp(DataAssignmentNode);

class AttributeNode extends Node {
    constructor(name, expr) {
        super();
        this._name = name;
        this._expr = expr;
    }

    get name() {
        return this._name;
    }

    get expression() {
        return this._expr;
    }

    gen(indent) {
        return sprintf("%s%s", this.name, this.expression ? "=\"" + this.expression.eval().toString() + "\"" : "");
    }
}
exp(AttributeNode);

class MetadataNode extends Node {
    constructor(id, cls, ref, attrs) {
        super();
        this._id = id;
        this._cls = cls;
        this._ref = ref;
        this._attrs = attrs;
    }

    get id() {
        return this._id;
    }

    get cls() {
        return this._cls;
    }

    get ref() {
        return this._ref;
    }

    get attributes() {
        return this._attrs;
    }

    set tag(t) {
        this._tag = t;
    }

    get tag() {
        return this._tag;
    }

    gen(indent) {
        let result = [];
        if(this.id) result.push("id = " + this.id);
        if(this.cls) result.push("class = " + this.cls);
        if(this.ref){
            const refAttribute = hrefTags.includes(this.tag) ? "href" : "src";
            result.push(refAttribute + " = " + this.ref.gen(0));
        }
        for (let i in this.attributes) {
            let attr = this.attributes[i];
            result.push(attr.gen(0));
        }
        return result.join(" ");
    }
}
exp(MetadataNode);

class IfStatementNode extends Node {
    constructor(expr, body, tail) {
        super();
        this._expr = expr;
        this._body = body;
        this._tail = tail;
    }

    get expression() {
        return this._expr;
    }

    get body() {
        return this._body;
    }

    get tail() {
        return this._tail;
    }

    gen(indent) {
        if(this.expression && this.expression.eval().value || !this.expression && !this.tail) return this.body.gen(indent);
        else if(this.tail) return this.tail.gen(indent);
    }
}
exp(IfStatementNode);

class ForLoopNode extends Node {
    constructor(id, expr, body) {
        super()
        this._id =  id;
        this._expr = expr;
        this._body = body;
    }

    get id() {
        return this._id;
    }

    get expression() {
        return this._expr;
    }

    get body() {
        return this._body;
    }

    gen(indent) {
        // TODO
        return "";
    }
}
exp(ForLoopNode);

class WhileLoopNode extends Node {
    constructor(expr, body) {
        super();
        this._expr = expr;
        this._body = body;
    }

    get expression() {
        return this._expr;
    }

    get body() {
        return this._body;
    }

    gen(indent) {
        // TODO
        return "";
    }
}
exp(WhileLoopNode);

class MatchCaseNode extends Node {
    constructor(expr, body) {
        super();
        this._expr = expr;
        this._body = body;
    }

    get expression() {
        return this._expr;
    }

    get body() {
        return this._body;
    }

    gen(indent) {
        // TODO
        return "";
    }
}
exp(MatchCaseNode);

class MatchNode extends Node {
    constructor(expr, body) {
        super();
        this._expr = expr;
        this._body = body;
    }

    get expression() {
        return this._expr;
    }

    get body() {
        return this._body;
    }

    gen(indent) {
        // TODO
        return "";
    }
}
exp(MatchNode);

class TemplateNode extends Node {
    constructor(name, params, body) {
        super();
        this._name = name;
        this._params = params;
        this._body = body;
    }

    get name() {
        return this._name;
    }

    get params() {
        return this._params;
    }

    get body() {
        return this._body;
    }

    gen(indent) {
        // TODO
        return "";
    }
}
exp(TemplateNode);

class FunctionCallNode extends Expression {
    constructor(name, args) {
        super();
        this._name = name;
        this._args = args;
    }

    get name() {
        return this._name;
    }

    get args() {
        return this._args;
    }

    eval() {
        // TODO
        return new values.ElkString("");
    }
}
exp(FunctionCallNode);

class StringNode extends Expression {
    constructor(str) {
        super();
        this._str = str;
    }

    get string() {
        return this._str;
    }

    eval() {
        return new values.ElkString(this.string);
    }

    isSimple() {
        return true;
    }
}
exp(StringNode);

class IntegerNode extends Expression {
    constructor(i) {
        super();
        this._i = i;
    }

    get integer() {
        return this._i;
    }

    eval() {
        return new values.ElkInteger(this.integer);
    }

    isSimple() {
        return true;
    }
}
exp(IntegerNode);