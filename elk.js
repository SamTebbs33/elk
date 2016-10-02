var P = require("parsimmon")
var minimist = require('minimist')
var fs = require("fs")

function exp(val, name) {
  if(!name) name = val.name
  module.exports[name] = val
}

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
exp(addTemplateFunction)

function getTemplateFunction(name) {
  return templateFunctions[name]
}
exp(getTemplateFunction)

function pushDataContext(context) {
  templateDataStack.push(context)
}
exp(pushDataContext)

function popDataContext() {
  return templateDataStack.pop()
}
exp(popDataContext)

function peekDataContext() {
  return templateDataStack[templateDataStack.length - 1]
}
exp(peekDataContext)

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
  if(throwException) throw new ElkError("Undefined variable '" + varArray.join(".") + "'")
  return undefined
}
exp(getDataFromContext)

function dataExistsInContext(varArray) {
  return getDataFromContext(varArray, false) !== undefined
}
exp(dataExistsInContext)

function setDataInContext(name, value) {
  peekDataContext()[name] = value
}
exp(setDataInContext)

function removeDataFromContext(name) {
  delete peekDataContext()[name]
}
exp(removeDataFromContext)

function getTemplateDataRoot() {
  return templateDataStack[0]
}
exp(getTemplateDataRoot)

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
var str = token(P.regexp(/"((?:\\.|.)*?)"/, 1)).map(a => new nodes.StringNode(interpretEscapes(a)))
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
var statement = P.lazy(function() { return P.alt(str, template_expr, tag) })
var attribute = P.seqMap(tag_identifier, colon, statement, function(name, c, s) {
  return new nodes.Attribute(name, s)
})
var attributes = surround(bracketl, P.sepBy1(attribute, comma), bracketr).map(a => new nodes.Attributes(a))
var block = P.lazy(function() {
  return P.alt(colon.then(statement), bracedBlock)
})
var tag = P.seqMap(tag_identifier, optional(clss), optional(id), optional(attributes), optional(block), function (name, cls, id, attrs, block) {
  return new nodes.Tag(name, cls, id, attrs, block)
})
var template_expr = P.lazy(function () { return P.alt(template_loop, template_if, template_func_call, template_var) })
var template_var = dollar_sign.then(P.sepBy1(identifier, dot)).map(a => new nodes.TemplateVar(a))
var func_call_args = P.sepBy(statement, comma)
var template_func_call = P.seqMap(identifier, parenl, func_call_args, parenr, function(id, p1, args, p2) {
  return new nodes.TemplateFuncCall(id, args)
})
var template_loop = keyw_for.then(P.seqMap(tag_identifier, keyw_in, template_expr, block, function (id, keyw, expr, block) {
  return new nodes.TemplateLoop(id, expr, block)
}))
var template_else = dollar_sign.then(keyw_else.then(block)).map(b => new nodes.TemplateIf(null, b, null))
var template_if = P.lazy(function(){return keyw_if.then(P.seqMap(template_expr, block,  optional(P.alt(keyw_else.then(template_if), template_else)), function(expr, block, e) {
  return new nodes.TemplateIf(expr, block, e)
}))})
var statements = statement.atLeast(0).map(a => new nodes.Statements(a))
var bracedBlock = surround(bracel, statements, bracer)

var indentString = "\t"

function makeStr(str, indent) {
  for(var i = 0; i < indent; i++) str = indentString + str
  return str;
}
exp(makeStr)

function isString(v) {
  return typeof v === "string"
}
exp(isString)

function isObject(v) {
  return typeof v === "object"
}
exp(isObject)

function isArray(v) {
  return v.constructor == Array
}
exp(isArray)

function ElkError (msg) {
  this.msg = msg
}
ElkError.prototype = new Error();
module.exports.ElkError = ElkError

function reportError(result) {
  var line = result.index.line
  var column = result.index.column
  var expected = result.expected
  console.log("Syntax error@" + line + ":" + column + ": expected " + expected.join(", "));
}
exp(reportError)

var fileExtension = ".elk"
exp(fileExtension, "fileExtension")

function removeExtension(str) {
  return str.slice(0, -fileExtension.length)
}
exp(removeExtension)

function isDir(path) {
  return fs.lstatSync(path).isDirectory()
}
exp(isDir)

function makeResult(errored, errData, successData) {
  if(!successData) successData = null
  return { errored: errored, errData: errData, data: successData }
}
exp(makeResult)

function parse(content) {
  var result = statements.parse(content)
  if(!result.status) return makeResult(true, { location: result.index, expected: result.expected })
  return makeResult(false, null, result.value)
}
exp(parse)

function convert(parseTree, indent) {
  if(!indent) indent = 0
  try {
    return makeResult(false, null, parseTree.gen(indent))
  } catch (err) {
    if(err instanceof ElkError) return makeResult(true, err.msg, null)
    else throw err
  }
}
exp(convert)

function compile(content, data, indent) {
  if(!data) data = {}
  pushDataContext(data)
  var result = parse(content)
  if(!result.errored) result = convert(result.data, indent);
  popDataContext()
  return result
}
exp(compile)

function compileFile(path, outputPath, data, config) {
  var content = fs.readFileSync(path).toString()
  var output = compile(content, data)
  if(output.errored) return output
  else fs.writeFileSync(outputPath, output.data)
  return output
}
exp(compileFile)

function compileDir(path, outputPath, data, config) {
  var files = fs.readdirSync(path)
  var results = {}
  for(var i in files) {
    var file = files[i]
    if(config.recurse && isDir(path + "/" + file)) {
      compileDir(path + "/" + file, outputPath + "/" + file, data, config)
    } else if(file.endsWith(fileExtension)) {
      var withoutExtension = removeExtension(file)
      results[file] = compileFile(path + "/" + file, outputPath + "/" + withoutExtension + ".html", data, config)
    }
  }
  return results
}
exp(compileDir)

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

require("./functions.js")
var nodes = require("./nodes.js")