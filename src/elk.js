var P = require("parsimmon")
var minimist = require('minimist')
var fs = require("fs")
var path = require("path")
var mkdirp = require("mkdirp")

var escapes = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  "\"": "\"",
  "\'": "\'"
};

function exp(val, name) {
  if(!name) name = val.name
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
var templates = {}

function addTemplateFunction(name, func) {
  templateFunctions[name] = func
}
exp(addTemplateFunction)

function getTemplateFunction(name) {
  return templateFunctions[name]
}
exp(getTemplateFunction)

function templateFunctionExists(name) {
  return getTemplateFunction(name) ? true : false
}
exp(templateFunctionExists)

function addTemplate(name, params, block) {
  if(!templates[name]) templates[name] = {}
  templates[name][params.length] = {params: params, block: block}
}
exp(addTemplate)

function getTemplate(name, numParams) {
  return templates[name] ? templates[name][numParams] : null
}
exp(getTemplate)

function templateExists(name, numParams) {
  return getTemplate(name, numParams) ? true : false
}
exp(templateExists)

function pushDataContext(context) {
  templateDataStack.unshift(context)
}
exp(pushDataContext)

function popDataContext() {
  return templateDataStack.shift()
}
exp(popDataContext)

function peekDataContext() {
  return templateDataStack[templateDataStack.length - 1]
}
exp(peekDataContext)

function getDataFromContext(varArray, throwException) {
  if(throwException === undefined) throwException = true
  var dataStack = templateDataStack
  var obj;
  for(var i in dataStack) {
    obj = dataStack[i]
    var found = true
    for(var i in varArray) {
      var varName = varArray[i]
      if(obj.hasOwnProperty(varName)) obj = obj[varName]
      else {
        found = false
        break
      }
    }
    if(found) break
  }
  if(found) return obj
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
var tag_identifier = token(P.regexp(/[-_a-zA-Z0-9]+/))
var identifier = token(P.regexp(/-?(?:-|[_a-z])+[-_a-zA-Z0-9-]*/))
var dot = token(P.string("."))
var at = token(P.string("@"))
var hash = token(P.string("#"))
var clss = dot.then(identifier)
var id = hash.then(identifier)
var colon = token(P.string(":"))
var equals = token(P.string("="))
var quotedStr = token(P.regexp(/"((?:\\.|.|\n)*?)"/, 1)).map(a => new nodes.StringNode(interpretEscapes(a)))
var singleQuotedStr = token(P.regexp(/'((?:\\.|.|\n)*?)'/, 1)).map(a => new nodes.StringNode(interpretEscapes(a)))
var str = P.alt(quotedStr, singleQuotedStr)
var denary_integer = token(P.regexp(/-?[0-9]+/)).map(s => new nodes.IntegerNode(parseInt(s, 10)))
var binary_integer = token(P.regexp(/0b[01]+/)).map(s => new nodes.IntegerNode(parseInt(s, 2)))
var hex_integer = token(P.regexp(/0x[a-f0-9A-F]+/)).map(s => new nodes.IntegerNode(parseInt(s, 16)))
var octal_integer = token(P.regexp(/0o[0-7]+/)).map(s => new nodes.IntegerNode(parseInt(s, 8)))
var float = token(P.regexp(/-?[0-9]*[.][0-9]+/)).map(s => new nodes.FloatNode(parseFloat(s)))
var integer = P.alt(denary_integer, binary_integer, hex_integer, octal_integer)
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
var keyw_match = token(P.string("match"))
var keyw_case = token(P.string("case"))
var keyw_default = token(P.string("default"))
var keyw_template = token(P.string("template"))
var keyw_data = token(P.string("data"))

var statement = P.lazy(function() {
  return P.seqMap(P.alt(data_def, template, str, template_expr, tag), optional(metadata), function (stmt, m) {
    if(stmt.metadata === null) stmt.metadata = m
    return stmt
  })
})
var statementNoMetadata = P.lazy(function() {
  return P.seqMap(P.alt(str, template_expr, tag), function (stmt) {
    return stmt
  })
})
var href = at.then(statementNoMetadata)
var attribute = P.seqMap(tag_identifier, optional(equals.then(statement)), function(name, s) {
  return new nodes.Attribute(name, s)
})
var attributes = surround(bracketl, P.sepBy1(attribute, comma), bracketr).map(a => new nodes.Attributes(a))
var metadata = P.seqMap(clss.atLeast(0), optional(id), optional(href), optional(attributes), function (c, i, h, a) {
  return new nodes.Metadata(c, i, h, a)
})
var statements = statement.atLeast(0).map(a => new nodes.Statements(a))
var bracedBlock = surround(bracel, statements, bracer)
var block = P.lazy(function() {
  return P.alt(colon.then(statement), bracedBlock)
})
var tag = P.seqMap(tag_identifier, optional(metadata), optional(block), function (name, m, block) {
  return new nodes.Tag(name, m, block)
})
var template_expr = P.lazy(function () { return P.alt(float, integer, json_object, json_array, str, template_loop, template_if, template_func_call, template_var, template_match) })
var template_var = dollar_sign.then(P.sepBy1(identifier, dot)).map(a => new nodes.TemplateVar(a))
var json_array = surround(bracketl, P.sepBy(template_expr, comma), bracketr).map(a => new nodes.JsonArray(a))
var json_field = P.seqMap(identifier, colon, template_expr, function (i, c, e) {
  return new nodes.JsonField(i, e)
})
var json_fields = P.sepBy1(json_field, comma)
var json_object = surround(bracel, json_fields, bracer).map(d => new nodes.JsonObject(d))
var func_call_args = P.sepBy(statement, comma)
var template_func_call = P.seqMap(identifier, parenl, func_call_args, parenr, function(id, p1, args, p2) {
  return new nodes.TemplateFuncCall(id, args)
})
var matchCase = P.seqMap(keyw_case, template_expr, block, function (k, e, b) {
  return new nodes.TemplateMatchCase(e, b)
})
var matchCaseDefault = keyw_default.then(block)
var matchBlock = P.seqMap(bracel, matchCase.atLeast(0), optional(matchCaseDefault), bracer, function (bl, c, d, br) {
  return new nodes.MatchBlock(c, d)
})
var template_match = P.seqMap(keyw_match, template_expr, matchBlock, function (k, e, b) {
  return new nodes.TemplateMatch(e, b)
})
var template_loop = keyw_for.then(P.seqMap(tag_identifier, keyw_in, template_expr, block, function (id, keyw, expr, block) {
  return new nodes.TemplateLoop(id, expr, block)
}))
var template_else = keyw_else.then(block).map(b => new nodes.TemplateIf(null, b, null))
var template_if = P.lazy(function(){return keyw_if.then(P.seqMap(template_expr, block,  optional(P.alt(keyw_else.then(template_if), template_else)), function(expr, block, e) {
  return new nodes.TemplateIf(expr, block, e)
}))})
var template_params = optional(surround(parenl, P.sepBy(identifier, comma), parenr))
var template = P.seqMap(keyw_template, identifier, template_params, block, function (k, i, p, b) {
  return new nodes.Template(i, p, b)
})
var data_assignment = P.seqMap(identifier, equals, template_expr, function (id, e, expr) {
  return new nodes.DataAssignment(id, expr)
})
var data_assignments = data_assignment.atLeast(0)
var data_block = surround(bracel, data_assignments, bracer)
var data_def = keyw_data.then(data_block).map(b => new nodes.DataDefinition(b))

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

function generate(parseTree, indent, data) {
  if(!indent) indent = 0
  if(!data) data = {}
  pushDataContext(data)
  try {
    var res = makeResult(false, null, parseTree.gen(indent))
    popDataContext()
    return res
  } catch (err) {
    popDataContext()
    if(err instanceof ElkError) return makeResult(true, err.msg, null)
    else throw err
  }
}
exp(generate)

function compile(content, data, indent) {
  if(!indent) indent = 0
  if(!data) data = {}
  var result = parse(content)
  if(!result.errored) result = generate(result.data, indent, data);
  return result
}
exp(compile)

function compileFile(path, outputPath, data) {
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
  var result = {}
  for(var i in files) {
    var file = files[i]
    var compileResult = null
    if(isDir(file)) compileResult = compileDir(file, outPath, data, config)
    else compileResult = compileFile(file, outPath + "/" + path.basename(file).replace(".elk", ".html"), data)
    result[file] = compileResult
  }
  return result
}
exp(compileFiles)

require("./functions.js")
var nodes = require("./nodes.js")
try {
  if (window) window.elk = module.exports
} catch (e) {
  // Catch window reference error
}
