var P = require("parsimmon")
var minimist = require('minimist')
var fs = require("fs")

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
  return whitespace.then(p.skip(whitespace));
}

function optional(p) {
  return p.atMost(1).map(function(x) { if(x.length === 0) return null; else return x[0] })
}

// Parsers
var tag_identifier = token(P.regexp(/[a-zA-Z0-9]+/))
var identifier = token(P.regexp(/-?[_a-zA-Z]+[_a-zA-Z0-9-]*/))
var clss = token(P.string(".")).then(identifier)
var id = token(P.string("#")).then(identifier)
var colon = token(P.string(":"))
var str = token(P.regexp(/"((?:\\.|.)*?)"/, 1)).map(interpretEscapes).desc('string');
var attribute = P.seqMap(tag_identifier, colon, str, function(name, c, s) {
  return {name: name, val: s}
})
var bracketl = token(P.string("["))
var bracketr = token(P.string("]"))
var bracel = token(P.string("{"))
var bracer = token(P.string("}"))
var comma = token(P.string(","))
var attributes = P.seqMap(bracketl, P.sepBy1(attribute, comma), bracketr, function(bracket, attrs, bracket2) {
  return attrs
})
var block = P.lazy(function() {
  return P.alt(colon.then(statement).map(function(x) { return [x] }), bracedBlock)
})
var tag = P.seqMap(tag_identifier, optional(clss), optional(id), optional(attributes), optional(block), function (name, cls, id, attrs, block) {
  return {name: name, clss: cls, id: id, attrs: attrs, block: block}
})
var statement = P.alt(tag, str)
var statements = statement.atLeast(0)
var bracedBlock = P.seqMap(bracel, statements, bracer, function(b1, stmts, b2) {
  return stmts
})

function makeStr(str, indent) {
  var resultString = ""
  for(var i = 0; i < indent; i++) resultString += "  "
  return resultString + str;
}

function isString(v) {
  return typeof v === "string"
}

function isObject(v) {
  return typeof v === "object"
}

function genStatements(statements, indent) {
  var stmtsStr = ""
  for(var i in statements) stmtsStr += "\n" + genStatement(statements[i], indent)
  return stmtsStr
}

function genStatement(stmt, indent) {
  if(isString(stmt)) return genStr(stmt, indent)
  else return genTag(stmt, indent)
}

function genStr(str, indent) {
  return makeStr(str, indent)
}

function genTag(tag, indent) {
  var headerStr = "<" + tag.name + genClass(tag.clss) + genID(tag.id) + genAttributes(tag.attrs) + ">"
  var bodyStr = genBlock(tag.block, indent + 1)
  var footerStr = "</" + tag.name + ">"
  return makeStr(headerStr , indent) + bodyStr + "\n" + makeStr(footerStr, indent)
}

function genBlock(block, indent) {
  if(isString(block)) return genStr(block, indent)
  else return genStatements(block, indent)
}

function genBracedBlock(block, indent) {
  return genStatements(block, indent)
}

function genClass(clss, indent) {
  return clss !== null ? " class=\"" + clss + "\"" : ""
}

function genID(id, indent) {
  return id !== null ? " id=\"" + id + "\"" : ""
}

function genAttributes(attrs, indent) {
  var attrsStr = ""
  for(var i in attrs) {
    var attr = attrs[i]
    attrsStr += " " + genAttribute(attr, indent)
  }
  return attrsStr
}

function genAttribute(attr, indent) {
  return attr.name + "=\"" + attr.val + "\""
}

function compileFile(path, outputPath) {
  console.log("compileFile " + path + " -> " + outputPath);
  var content = fs.readFileSync(path).toString()
  var result = statements.parse(content)
  console.log(result);
  var output = genStatements(result.value, 0)
  fs.writeFileSync(outputPath, output)
}

var args = minimist(process.argv.slice(2))
if(args._.length === 0) console.log("Missing input file");
else {
  var path = args._[0]
  var outputPath = args.o
  compileFile(path, outputPath)
}
