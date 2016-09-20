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

function token(p) {
  return whitespace.then(p.skip(whitespace));
}

function optional(p) {
  return p.atMost(1).map(function(x) { if(x.length === 0) return null; else return x[0] })
}

function type(p, id) {
  return p.desc(id).map(function (x) {
    return {type: id, node: x}
  })
}

var templateData = {}

var ATTRIBUTES = "attributes",
  BLOCK = "block",
  TAG = "tag",
  STATEMENT = "statement",
  STATEMENTS = "statements",
  BRACED_BLOCK = "braced block",
  TAG_IDENTIFIER = "tag identifier",
  STRING = "string",
  IDENTIFIER = "identifier",
  CLASS = "class",
  ID = "id",
  COLON = "colon",
  ATTRIBUTE = "attribute",
  BRACKETL = "left bracket",
  BRACKETR = "right bracket",
  BRACEL = "left brace",
  BRACER = "right brace",
  PARENL = "left parenthesis",
  PARENR = "right parenthesis",
  COMMA = "comma",
  DOT = "dot",
  DOLLAR_SIGN = "dollar sign",
  FOR = "for",
  IN = "in",

// Parsers
var comment = P.regexp(/\s*(?:\/\/).*/)
var whitespace = P.regexp(/\s*/m)
var tag_identifier = token(P.regexp(/[a-zA-Z0-9]+/))
var identifier = token(P.regexp(/-?[_a-zA-Z]+[_a-zA-Z0-9-]*/))
var dot = token(P.string("."))
var hash = token(P.string("#"))
var clss = dot.then(identifier)
var id = hash.then(identifier)
var colon = token(P.string(":"))
var str = type(token(P.regexp(/"((?:\\.|.)*?)"/, 1)).map(interpretEscapes), STRING);
var attribute = P.seqMap(tag_identifier, colon, str, function(name, c, s) {
  return {name: name, val: s}
})
var bracketl = token(P.string("["))
var bracketr = token(P.string("]"))
var bracel = token(P.string("{"))
var bracer = token(P.string("}"))
var parenl = token(P.string("("))
var parenr = token(P.string(")"))
var comma = token(P.string(","))
var dollar_sign = token(P.string("$"))
var keyw_for = token(P.string("for"))
var keyw_in = token(P.string("in"))
var attributes = bracketl.then(P.sepBy1(attribute, comma)).skip(bracketr)
var block = P.lazy(function() {
  return P.alt(colon.then(statement), bracedBlock)
})
var tag = type(P.seqMap(tag_identifier, optional(clss), optional(id), optional(attributes), optional(block), function (name, cls, id, attrs, block) {
  return {name: name, clss: cls, id: id, attrs: attrs, block: block}
}), TAG)
var statement = type(P.alt(tag, str, dollar_sign.then(template_expr)), STATEMENT)
var statements = type(statement.atLeast(0), STATEMENTS)
var bracedBlock = bracel.then(statements).skip(bracer)

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

function isArray(v) {
  return v.constructor == Array
}

function genStatements(statements, indent) {
  var stmtsStr = ""
  for(var i in statements) stmtsStr += (i > 0 ? "\n" : "") + genStatement(statements[i].node, indent)
  return stmtsStr
}

function genStatement(stmt, indent) {
  var node = stmt.node
  switch (stmt.type) {
    case STRING: return genStr(node, indent)
    case TAG: return genTag(node, indent)
  }
}

function genStr(str, indent) {
  return makeStr(str, indent)
}

function genTag(tag, indent) {
  var headerStr = "<" + tag.name + genClass(tag.clss) + genID(tag.id) + genAttributes(tag.attrs) + ">"
  var hasBlock = tag.block !== null
  var blockIsSingle = hasBlock && (tag.block.length === 0 || tag.block.type === STRING)
  var bodyStr = hasBlock ? genBlock(tag.block, blockIsSingle ? 0 : indent + 1) : ""
  var footerStr = makeStr("</" + tag.name + ">", blockIsSingle ? 0 : indent)
  var bodySeparator = blockIsSingle ? "" : "\n"
  return makeStr(headerStr , indent) + (hasBlock ? (bodySeparator + bodyStr + bodySeparator + footerStr) : "")
}

function genBlock(block, indent) {
  var node = block.node
  switch (block.type) {
    case STRING: return genStr(node, indent)
    case STATEMENTS: return genStatements(node, indent)
    case STATEMENT: return genStatement(node, indent)
  }
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

function reportError(result) {
  var line = result.index.line
  var column = result.index.column
  var expected = result.expected
  console.log("Syntax error@" + line + ":" + column + ": expected " + expected.join(", "));
}

var fileExtension = ".elk"

function removeExtension(str) {
  return str.slice(0, -fileExtension.length)
}

function isDir(path) {
  return fs.lstatSync(path).isDirectory()
}

function makeResult(errored, errData, successData) {
  if(!successData) successData = null
  return { errored: errored, errData: errData, data: successData }
}

function parse(content) {
  var result = statements.parse(content)
  if(!result.status) return makeResult(true, { location: result.index, expected: result.expected })
  return makeResult(false, null, result.value)
}

function convert(parseTree) {
  try {
    return genStatements(parseTree.node, 0)
  } catch (err) {
    return makeResult(true, err, null)
  }
}

function compile(content, data) {
  templateData = data
  var result = parse(content)
  if(result.errored) return result;
  else return convert(result.data)
}

function compileFile(path, outputPath, data, config) {
  var content = fs.readFileSync(path).toString()
  return compile(content, data)
}

function compileDir(path, outputPath, data, config) {
  var files = fs.readdirSync(path)
  for(var i in files) {
    var file = files[i]
    if(config.recurse && isDir(path + "/" + file)) {
      compileDir(path + "/" + file, outputPath + "/" + file, true)
    } else if(file.endsWith(fileExtension)) {
      var withoutExtension = removeExtension(file)
      compileFile(path + "/" + file, outputPath + "/" + withoutExtension + ".html")
    }
  }
}

function compileFiles(files, outPath, data, config) {
  if(!config) config = {
    recurse: false
  }
  if(!data) data = {}
  for(var i in files) {
    var file = files[i]
    var error = null
    if(isDir(file)) error = compileDir(file, outPath, data, config)
    else error = compileFile(file, outPath, data, config)
    if(error) return error
  }
}

module.exports.compile = compile
module.exports.parse = parse
module.exports.convert = convert
