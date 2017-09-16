/**
 * Created by samtebbs on 28/09/2016.
 */

var elk = require("./elk.js")

var hrefTags = ["a", "link"]
var voidTags = ["area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"]

function exp(val, name) {
  if(!name) name = val.name
  module.exports[name] = val
}

class Node {
  isSimple() {
    return this instanceof StringNode || this instanceof TemplateVar
  }
  gen(indent){ return "" }
}

class Statement extends Node {
  constructor() {
    super()
    this.metadata = null
  }

  wrapMetadata(indent, genStr) {
    if(this.metadata !== null) {
      var metaStr = this.metadata.gen(0)
      if(metaStr !== "") return "<span" + metaStr + ">" + genStr + "</span>"
    }
    return genStr
  }

}
exp(Statement)

class TemplateExpr extends Statement {

  gen(indent) {
    var evalResult = this.eval(indent)
    if(evalResult instanceof Statements) return evalResult.gen(indent)
    else if(elk.isString(evalResult)) return evalResult
    if(evalResult instanceof Statement) {
      if(!evalResult.metadata) evalResult.metadata = this.metadata
      else evalResult.metadata.merge(this.metadata)
      if(evalResult instanceof Tag && evalResult.metadata) evalResult.metadata.onTag(evalResult)
    }
    if(evalResult instanceof Node) return evalResult.gen(indent)
    else return this.wrapMetadata(indent, evalResult)
  }

  eval(indent) {
    throw "Unimplemented"
  }

}
exp(TemplateExpr)

class StringNode extends TemplateExpr {
  constructor(str) {
    super()
    this.str = str
  }

  eval(indent) {
    var s = this.str.replace(/.*?\$\(([a-z_](?:\.|[a-z_]|[0-9])*)\)/g, function(match) {
      var index = match.indexOf("$(")
      var prefix = match.substr(0, index)
      var varName = match.substring(index + 2, match.length - 1)
      var varArray = varName.split(".")
      var val = elk.getDataFromContext(varArray)
      if(val instanceof TemplateExpr) val = val.eval(0)
      else if(val instanceof Node) val = val.gen(0)
      return prefix + val
    })
    if(s.endsWith(" ")) s = s.substring(0, s.length - 1) + "&nbsp;"
    if(s.startsWith(" ")) s = "&nbsp;" + s.substring(1, s.length)
    return elk.makeStr(s, indent)
  }

}
exp(StringNode)

class Attribute extends Node {

  constructor(attrName, val) {
    super()
    this.attrName = attrName
    this.val = val
  }

  gen(indent) {
    return this.attrName + (this.val ? "=\"" + this.val.gen(0) + "\"" : "")
  }

}
exp(Attribute)

class Attributes extends Node {

  constructor(attrArray) {
    super()
    this.attrs = attrArray
  }

  add(name, val) {
    this.attrs.push(new Attribute(name, val))
  }

  gen(indent) {
    var attrsStr = ""
    for(var i in this.attrs) {
      var attr = this.attrs[i]
      attrsStr += " " + attr.gen(indent)
    }
    return attrsStr
  }

}
exp(Attributes)

class TemplateMatchCase {
  constructor(e, b) {
    this.expr = e
    this.block = b
  }
}
exp(TemplateMatchCase)

class MatchBlock {
  constructor(c, d) {
    this.cases = c
    this.default = d
  }

  gen(indent, exprResult) {
    for (var i in this.cases) {
      var c = this.cases[i]
      var caseResult = c.expr.eval(0)
      if(caseResult == exprResult) return c.block.gen(indent)
    }
    return this.default ? this.default.gen(indent) : " "
  }

}
exp(MatchBlock)

class TemplateMatch extends TemplateExpr {
  constructor(e, b) {
    super()
    this.expr = e
    this.block = b
  }

  eval(indent) {
    var exprResult = this.expr.eval(0)
    return this.block.gen(indent, exprResult)
  }

}
exp(TemplateMatch)

class TemplateVar extends TemplateExpr {

  constructor(varArray) {
    super()
    this.varArray = varArray
  }

  exists() {
    return elk.dataExistsInContext(this.varArray)
  }

  eval(indent) {
    return elk.getDataFromContext(this.varArray)
  }
}
exp(TemplateVar)

class TemplateFuncCall extends TemplateExpr {

  constructor(funcName, args) {
    super()
    this.funcName = funcName
    this.args = args
  }

  eval(indent) {
    var func = elk.getTemplateFunction(this.funcName)
    var template = elk.getTemplate(this.funcName, this.args.length)
    if(!func && !template) throw new elk.ElkError("Undefined function or matching template '" + this.funcName + "'")
    if(func) return func(indent, this.args)
    else {
      var dataObj = {}
      for(var i in template.params) dataObj[template.params[i]] = this.args[i]
      elk.pushDataContext(dataObj)
      var str = template.block.gen(indent)
      elk.popDataContext()
      return str
    }
    return " "
  }

}
exp(TemplateFuncCall)

class TemplateLoop extends TemplateExpr {

  constructor(varName, expr, block) {
    super()
    this.varName = varName
    this.expr = expr
    this.block = block
  }

  gen(indent) {
    var array = this.expr.eval(indent)
    if(elk.dataExistsInContext(this.varName)) throw new elk.ElkError("Variable '" + this.varName + "' is already defined")
    else {
      var resultArray = []
      for(var i in array) {
        var elem = array[i]
        var obj = {}
        obj[this.varName] = elem
        elk.pushDataContext(obj)
        resultArray.push(this.block.gen(indent))
        elk.popDataContext()
      }
      return resultArray.join("\n")
    }
  }

}
exp(TemplateLoop)

class TemplateIf extends TemplateExpr {

  constructor(expr, block, else_stmt) {
    super()
    this.expr = expr
    this.block = block
    this.else_stmt = else_stmt
  }

  eval(indent) {
    if(!this.expr) return this.block.gen(indent)
    else {
      var val = this.expr.eval(indent)
      if(val === true) return this.block.gen(indent)
      else if(this.else_stmt) return this.else_stmt.eval(indent)
      else return ""
    }
  }

}
exp(TemplateIf)

class Metadata extends Node {

  constructor(c, i, h, a) {
    super()
    this.classes = c
    this.id = i
    this.attrs = a
    this.href = h
  }

  onTag(tag) {
    if(this.href) {
      var hrefAttribute = "src"
      if(hrefTags.includes(tag.tag)) hrefAttribute = "href"
      if (this.attrs) this.attrs.add(hrefAttribute, this.href)
      else this.attrs = new Attributes([new Attribute(hrefAttribute, this.href)])
    }
  }

  merge(m) {
    if (!m) return
    if(this.attrs) this.attrs.merge(m.attrs)
    for(var i in m.classes) {
      var cls = m.classes[i]
      this.classes.push(cls)
    }
    if(m.href) this.href = m.href
    if(m.id) this.id = m.id
  }

  gen(indent) {
    var classStr = this.classes.length > 0 ? " class='" + this.classes.join(" ") + "'" : ""
    var idStr = this.id ? " id='" + this.id + "'" : ""
    var attrsStr = this.attrs ? this.attrs.gen(0) : ""
    return classStr + idStr + attrsStr
  }

}
exp(Metadata)

class Tag extends Statement {

  constructor(tag, m, block, generatedBlock) {
    super()
    this.tag = tag
    this.metadata = m
    this.block = block
    this.generatedBlock = generatedBlock
    if(this.metadata) this.metadata.onTag(this)
  }

  gen(indent) {
    var hasBlock = this.block !== null
    var isVoidTag = voidTags.includes(this.tag)
    var headerStr = "<" + this.tag + this.metadata.gen(0) + ">"
    var blockIsSingle = this.generatedBlock || (hasBlock && (this.block instanceof StringNode || this.block instanceof TemplateVar))
    var bodyStr = this.generatedBlock ? this.generatedBlock : (hasBlock ? this.block.gen(blockIsSingle ? 0 : indent + 1) : "")
    var hasBody = bodyStr !== ""
    var needsClosingTag = hasBody || !isVoidTag
    var footerStr = needsClosingTag ? elk.makeStr("</" + this.tag + ">", blockIsSingle || !hasBlock ? 0 : indent) : ""
    var bodySeparator = blockIsSingle ? "" : "\n"
    var str = elk.makeStr(headerStr , indent)
    if(hasBody) str += bodySeparator + bodyStr + bodySeparator
    str += footerStr
    return str
  }

}
exp(Tag)

class Statements extends Node {

  constructor(stmtArr) {
    super()
    this.stmtArr = stmtArr
  }

  add(stmt) {
    this.stmtArr.push(stmt)
  }

  gen(indent) {
    var stmtsStr = ""
    for(var i in this.stmtArr) stmtsStr += (i > 0 ? "\n" : "") + this.stmtArr[i].gen(indent)
    return stmtsStr
  }

}
exp(Statements)

class Template extends Node {
  constructor(i, p, b) {
    super()
    this.name = i
    this.params = p ? p : []
    this.block = b
  }

  gen(indent) {
    if(elk.templateExists(this.name, this.params.length) || elk.templateFunctionExists(this.name)) throw new elk.ElkError("Template or function with the name \'" + this.name + "\' already exists")
    else elk.addTemplate(this.name, this.params, this.block)
    return " "
  }

}
exp(Template)
