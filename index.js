var P = require("parsimmon")

function interpretEscapes(str) {
  var escapes = {
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t'
  };
  return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, function(_, escape) {
    var type = escape.charAt(0);
    var hex = escape.slice(1);
    if (type === 'u') return String.fromCharCode(parseInt(hex, 16));
    if (escapes.hasOwnProperty(type)) return escapes[type];
    return type;
  });
}

var whitespace = P.regexp(/\s*/m)

function token(p) {
  return p.skip(whitespace);
}

function optional(p) {
  return p.atMost(1).map(function(x) { if(x.length === 0) return null; else return x[0] })
}

// Parsers
var tag_identifier = token(P.regexp(/[a-zA-Z0-9]/))
var identifier = P.regexp(/-?[_a-zA-Z]+[_a-zA-Z0-9-]*/)
var clss = P.string(".").then(identifier)
var id = P.string("#").then(identifier)
var colon = token(P.string(":"))
var str = token(P.regexp(/"((?:\\.|.)*?)"/, 1)).map(interpretEscapes).desc('string');
var attribute = P.seqMap(tag_identifier, colon, str, function(ident, c, s) { return {ident: ident, val: s} })
var bracketl = token(P.string("["))
var bracketr = token(P.string("]"))
var bracel = token(P.string("{"))
var bracer = token(P.string("}"))
var comma = token(P.string(","))
var attributes = P.seqMap(bracketl, P.sepBy1(attribute, comma), bracketr, function(bracket, attrs, bracket2) { return attrs })
var block = P.lazy(function() {
  return P.oneOf(colon.then(statement), bracedBlock)
})
var tag = P.seq(tag_identifier, optional(clss), optional(id), optional(block))
var statement = P.oneOf(tag, str)
var statements = statement.atLeast(0)
var bracedBlock = P.seqMap(bracel, statements, bracer, function(b1, stmts, b2) { return stmts })
console.log(str.parse('"hi"'));
