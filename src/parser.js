var P = require("parsimmon");
var nodes = require("./nodes.js")

function exp(val, name) {
    if (!name) name = val.name;
    module.exports[name] = val
}

function interpretEscapes(str) {
    return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/g, function(_, escape) {
        var type = escape.charAt(0);
        var hex = escape.slice(1);
        if (type === 'u') return String.fromCharCode(parseInt(hex, 16));
        if (escapes.hasOwnProperty(type)) return escapes[type];
        return type;
    });
}

const whitespace = P.regexp(/\s*/m)

function token(parser) {
    return whitespace.then(parser.skip(whitespace));
}

function strToken(str) {
    return token(P.string(str));
}

function regexToken(regex) {
    return token(P.regexp(regex));
}

function optional(p) {
    return p.atMost(1).map(function(x) { if(x.length === 0) return null; else return x[0] })
}

function surround(surrounder, parser, surrounder2) {
    return surrounder.then(parser.skip(surrounder2))
}

// Terminals
const hash = strToken("#");
const dot = strToken(".");
const at = strToken("@");
const colon = strToken(":");
const leftBrace = strToken("{");
const rightBrace = strToken("}");
const equals = strToken("=");
const leftBracket = strToken("[");
const rightBracket = strToken("]");
const comma = strToken(",");
const leftParen = strToken("(");
const rightParen = strToken(")");
const quote = strToken("\"");
const dollarSign = strToken("$");
const tagIdentifier = regexToken(/[-_a-zA-Z0-9]+/);

const keywordIf = strToken("if");
const keywordElse = strToken("else");
const keywordFor = strToken("for");
const keywordIn = strToken("in");
const keywordWhile = strToken("while");
const keywordMatch = strToken("match");
const keywordCase = strToken("case");
const keywordDefault = strToken("default");
const keywordTemplate = strToken("template");

const double_string = regexToken(/"((?:\\.|.|\n)*?)"/);
const single_string = regexToken(/'((?:\\.|.|\n)*?)'/);
const string = P.alt(double_string, single_string).map(s => new nodes.StringNode(interpretEscapes(s.substr(1, s.length - 2))));
const integer = regexToken(/[1-9]+[0-9]*/).map(s => new nodes.IntegerNode(parseInt(s)));
const boolean = P.alt(strToken("true"), strToken("false")).map(str => new nodes.BooleanNode(str === "true"));

/*
 Non-terminals
*/
const variable = dollarSign.then(P.sepBy1(tagIdentifier, dot)).map(a => new nodes.VariableNode(a));
const tagID = hash.then(tagIdentifier);
const tagClass = dot.then(tagIdentifier);
const tagRef = at.then(string);

const expression = P.lazy(function () {
    return P.alt(boolean, string, functionCall, integer, variable);
});
const statement = P.lazy(function () {
    return P.alt(control, dataAssignment, expression, tag);
});
const statements = statement.atLeast(0);
exp(statements, "statements");

const statementBody = P.alt(
    colon.then(statement).map(function (stmt) {
        return [stmt];
    }),
    surround(leftBrace, statements, rightBrace)
);
const attribute = P.seqMap(tagIdentifier, optional(equals.then(expression)), function (id, expr) {
    return new nodes.AttributeNode(id, expr);
});
const attributes = surround(leftBracket, P.sepBy1(attribute, comma), rightBracket);
const metadata = P.seqMap(optional(tagID), tagClass.atLeast(0), optional(tagRef), optional(attributes), function (id, cls, ref, attr) {
    return new nodes.MetadataNode(id, cls, ref, attr);
});
const tag = P.seqMap(tagIdentifier, optional(metadata), optional(statementBody), function (id, m, body) {
    return new nodes.TagNode(id, m, body);
});
const dataAssignment = P.seqMap(tagIdentifier, equals, expression, function (v, eq, expr) {
    return new nodes.DataAssignmentNode(v, expr);
});
const elseStmt = keywordElse.then(statementBody).map(function (body) {
    return new nodes.IfStatementNode(null, body, null);
});
const ifStmtTail = P.lazy(function () {
    return P.alt(keywordElse.then(ifStmt), elseStmt);
});
const ifStmt = P.lazy(function() {
    return keywordIf.then(P.seqMap(expression, statementBody, optional(ifStmtTail), function (expr, body, tail) {
        return new nodes.IfStatementNode(expr, body, tail);
    }));
});
const forLoop = keywordFor.then(P.seqMap(tagIdentifier, keywordIn, expression, statementBody, function (id, i, expr, body) {
    return new nodes.ForLoopNode(id, expr, body);
}));
const whileLoop = keywordWhile.then(P.seqMap(expression, statementBody, function (expr, body) {
    return new nodes.WhileLoopNode(expr, body);
}));
const matchCase = keywordCase.then(P.seqMap(expression, statementBody, function (expr, body) {
    return new nodes.MatchCaseNode(expr, body);
}));
const matchBody = P.alt(
    colon.then(matchCase).map(function (c) {
        return [c];
    }),
    surround(leftBrace, matchCase.atLeast(0), rightBrace)
);
const matchStmt = keywordMatch.then(P.seqMap(expression, matchBody, function (expr, body) {
    return new nodes.MatchNode(expr, body);
}));
const templateParams = optional(surround(leftParen, P.sepBy1(tagIdentifier, comma), rightParen)).map(function (params) {
    return params || [];
});
const template = keywordTemplate.then(P.seqMap(tagIdentifier, templateParams, statementBody, function (id, params, body) {
    return new nodes.TemplateNode(id, params, body);
}));
const control = P.alt(ifStmt, forLoop, whileLoop, matchStmt, template);

// Expressions
const functionCall = P.seqMap(tagIdentifier, surround(leftParen, P.sepBy1(expression, comma), rightParen), function (tag, args) {
    return new nodes.FunctionCallNode(tag, args);
});