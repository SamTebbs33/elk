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

function surround(surrounder, parser, surrounder2) {
  return surrounder.then(parser.skip(surrounder2))
}

function type(p, id) {
  return p.desc(id).map(function (x) {
    return {type: id, node: x}
  })
}

var templateDataStack = []
var templateFunctions = {}

function addTemplateFunction(name, func) {
  templateFunctions[name] = func
}

function getTemplateFunction(name) {
  return templateFunctions[name]
}

function pushDataContext(context) {
  templateDataStack.push(context)
}

function popDataContext() {
  return templateDataStack.pop()
}

function peekDataContext() {
  return templateDataStack[templateDataStack.length - 1]
}

function getDataFromContext(varArray, throwException) {
  if(throwException === undefined) throwException = true
  var dataStack = templateDataStack.reverse()
  for(var i in dataStack) {
    var obj = dataStack[i]
    var found = true
    for(var i in varArray) {
      var varName = varArray[i]
      if(obj.hasOwnProperty(varName)) obj = obj[varName]
      else {
        found = false
        break
      }
    }
    if(found) return obj
  }
  if(throwException) throw "Undefined variable '" + varArray.join(".") + "'"
  return undefined
}

function dataExistsInContext(varArray) {
  return getDataFromContext(varArray, false) !== undefined
}

function setDataInContext(name, value) {
  peekDataContext()[name] = value
}

function removeDataFromContext(name) {
  delete peekDataContext()[name]
}

function getTemplateDataRoot() {
  return templateDataStack[0]
}

var ATTRIBUTES = "attributes",
  BLOCK = "block",
  TAG = "tag",
  TEMPLATE_VAR = "template variable",
  TEMPLATE_FUNC_CALL = "template function call",
  TEMPLATE_LOOP = "template loop",
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
  TEMPLATE_EXPR = "template expression",
  FUNC_CALL_ARGS = "function call args",
  IF = "if",
  ELSE = "else"

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
var keyw_if = token(P.string("if"))
var keyw_else = token(P.string("else"))
var statement = type(P.lazy(function() { return P.alt(tag, str, template_expr) }), STATEMENT)
var attribute = P.seqMap(tag_identifier, colon, statement, function(name, c, s) {
  return {name: name, val: s}
})
var attributes = surround(bracketl, P.sepBy1(attribute, comma), bracketr)
var block = P.lazy(function() {
  return P.alt(colon.then(statement), bracedBlock)
})
var tag = type(P.seqMap(tag_identifier, optional(clss), optional(id), optional(attributes), optional(block), function (name, cls, id, attrs, block) {
  return {name: name, clss: cls, id: id, attrs: attrs, block: block}
}), TAG)
var template_expr = dollar_sign.then(type(P.lazy(function () { return P.alt(template_loop, template_if, template_func_call, template_var) }), TEMPLATE_EXPR))
var template_var = type(P.sepBy1(identifier, dot), TEMPLATE_VAR)
var func_call_args = P.sepBy(statement, comma)
var template_func_call = type(P.seqMap(identifier, parenl, func_call_args, parenr, function(id, p1, args, p2) {
  return {name: id, args: args}
}), TEMPLATE_FUNC_CALL)
var template_loop = type(keyw_for.then(P.seqMap(tag_identifier, keyw_in, template_expr, block, function (id, keyw, expr, block) {
  return {name: id, expr: expr, block: block}
})), TEMPLATE_LOOP)
var template_else = type(dollar_sign.then(keyw_else.then(block)), ELSE)
var template_if = type(P.lazy(function(){return keyw_if.then(P.seqMap(template_expr, block,  optional(P.alt(keyw_else.then(template_if), template_else)), function(expr, block, e) {
  return {expr: expr, block: block, else_stmt: e}
}))}), IF)
var statements = type(statement.atLeast(0), STATEMENTS)
var bracedBlock = surround(bracel, statements, bracer)

var indentString = "\t"

function makeStr(str, indent) {
  var resultString = str
  for(var i = 0; i < indent; i++) str = indentString + str
   return str;
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

function evalTemplateVar(node, indent) {
  return getDataFromContext(node)
}

function evalTemplateFuncCall(call, indent) {
  var funcName = call.name
  var func = templateFunctions[funcName]
  if(!func) throw "Undefined function '" + funcName + "'"
  else return func(indent, call.args)
}

function genTemplateLoop(loop, indent) {
  var varName = loop.name
  var array = evalTemplateExpr(loop.expr.node)
  var block = loop.block
  if(dataExistsInContext(varName)) throw "Variable '" + varName + "' is already defined"
  else {
    var resultArray = []
    for(var i in array) {
      var elem = array[i]
      setDataInContext(varName, elem)
      resultArray.push(genBlock(block, indent))
    }
    removeDataFromContext(varName)
    return resultArray.join("\n")
  }
}

function evalTemplateIf(node, indent) {
  if(!node.expr) return genBlock(node, indent)
  else {
    var val = evalTemplateExpr(node.expr.node, indent)
    if(val === true) return genBlock(node.block, indent)
    else if(node.else_stmt) {
      console.log("else: " + JSON.stringify(node.else_stmt));
      return evalTemplateExpr(node.else_stmt, indent)
    }
    else return ""
  }
}

function evalTemplateExpr(expr, indent) {
  console.log("evaltemplate: " + JSON.stringify(expr));
  var node = expr.node
  switch (expr.type) {
    case TEMPLATE_VAR: return evalTemplateVar(node, indent)
    case TEMPLATE_LOOP: return genTemplateLoop(node, indent)
    case TEMPLATE_FUNC_CALL: return evalTemplateFuncCall(node, indent)
    case ELSE: return evalTemplateIf(node, indent)
    case IF: return evalTemplateIf(node, indent)
  }
}

function genTemplateExpr(expr, indent) {
  return evalTemplateExpr(expr, indent).toString()
}

function genStatement(stmt, indent) {
  var node = stmt.node
  switch (stmt.type) {
    case STRING: return genStr(node, indent)
    case TAG: return genTag(node, indent)
    case TEMPLATE_EXPR: return genTemplateExpr(node, indent)
  }
}

function genStr(str, indent) {
  str = str.replace(/.*?\$\(([a-z_](?:\.|[a-z_]|[0-9])*)\)/g, function(match) {
    var index = match.indexOf("$(")
    var prefix = match.substr(0, index)
    var varName = match.substring(index + 2, match.length - 1)
    var varArray = varName.split(".")
    return prefix + getDataFromContext(varArray)
  })
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
  return attr.name + "=\"" + genStatement(attr.val.node) + "\""
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

function convert(parseTree, indent) {
  if(!indent) indent = 0
  try {
    return makeResult(false, null, genStatements(parseTree.node, indent))
  } catch (err) {
    return makeResult(true, err, null)
  }
}

function compile(content, data, indent) {
  pushDataContext(data)
  var result = parse(content)
  if(!result.errored) result = convert(result.data, indent);
  popDataContext()
  return result
}

function compileFile(path, outputPath, data, config) {
  var content = fs.readFileSync(path).toString()
  var output = compile(content, data)
  if(output.errored) return output
  else fs.writeFileSync(outputPath, output.data)
  return output
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

addTemplateFunction("list", function(indent, args) {
  var str = makeStr("<ul>", indent)
  var array = evalTemplateExpr(args[0].node.node)
  var format = args[1].node
  for(var i in array) {
    var item = array[i]
    pushDataContext({_item: item})
    str += "\n" + makeStr("<li>" + genStatement(format, indent) + "</li>", indent + 1)
    popDataContext()
  }
  return str + "\n" + makeStr("</ul>", indent)
})

addTemplateFunction("pages", function(indent, args) {
  var path = args.length > 0 ? genStatement(args[0].node, 0) : "."
  var files = fs.readdirSync(path).filter(function(elem) {
    return elem.endsWith(".html")
  })
  return files
})

addTemplateFunction("include", function(indent, args) {
  var path = genStatement(args[0].node) + fileExtension
  var content = fs.readFileSync(path).toString()
  var compiled = compile(content, getTemplateDataRoot(), indent)
  return compiled.data ? compiled.data : ""
})

module.exports.compile = compile
module.exports.compileFile = compileFile
module.exports.parse = parse
module.exports.convert = convert
