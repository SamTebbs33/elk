/**
 * Created by samtebbs on 28/09/2016.
 */

function exp(val, name) {
  if(!name) name = val.name
  module.exports[name] = val
}

class Node {
  gen(indent){ return "" }
}

class StringNode extends Node {
  constructor(str) {
    super()
    this.str = str
  }

  gen(indent) {
    str = str.replace(/.*?\$\(([a-z_](?:\.|[a-z_]|[0-9])*)\)/g, function(match) {
      var index = match.indexOf("$(")
      var prefix = match.substr(0, index)
      var varName = match.substring(index + 2, match.length - 1)
      var varArray = varName.split(".")
      return prefix + elk.getDataFromContext(varArray)
    })
    return elk.makeStr(str, indent)
  }

}
exp(StringNode)

class Attribute extends Node {

  constructor(attrName, val) {
    this.attrName = attrName
    this.val = val
  }

  gen(indent) {
    return attrName + "=\"" + val.gen(0) + "\""
  }

}
exp(Attribute)

class Attributes extends Node {

  constructor(attrArray) {
    this.attrs = attrArray
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

class TemplateExpr extends Node {

  gen(indent) {
    return eval(indent)
  }

  eval(indent) {
    throw "Unimplemented"
  }

}
exp(TemplateExpr)

class TemplateVar extends TemplateExpr {

  constructor(varArray) {
    this.varArray = varArray
  }

  eval(indent) {
    return elk.getDataFromContext(varArray)
  }
}
exp(TemplateVar)

class TemplateFuncCall extends TemplateExpr {

  constructor(funcName, args) {
    this.funcName = funcName
    this.args = args
  }

  eval(indent) {
    var func = elk.getTemplateFunction(this.funcName)
    if(!func) throw new elk.ElkError("Undefined function '" + this.funcName + "'")
    else return func(indent, this.args)
  }

}
exp(TemplateFuncCall)

class TemplateLoop extends TemplateExpr {

  constructor(varName, expr, block) {
    this.varName = varName
    this.expr = expr
    this.block = block
  }

  gen(indent) {
    var array = this.expr.eval(indent)
    var block = this.block
    if(elk.dataExistsInContext(this.varName)) throw new elk.ElkError("Variable '" + this.varName + "' is already defined")
    else {
      var resultArray = []
      for(var i in array) {
        var elem = array[i]
        elk.setDataInContext(this.varName, elem)
        resultArray.push(block.gen(indent))
      }
      elk.removeDataFromContext(this.varName)
      return resultArray.join("\n")
    }
  }

}
exp(TemplateLoop)

class TemplateIf extends TemplateExpr {

  constructor(expr, block, else_stmt) {
    this.expr = expr
    this.block = block
    this.else_stmt = else_stmt
  }

  eval(indent) {
    if(!this.expr) return this.block.gen(indent)
    else {
      var val = this.expr.eval(indent)
      if(val === true) return this.block.gen(indent)
      else if(this.else_stmt) {
        return this.else_stmt.eval(indent)
      }
      else return ""
    }
  }

}
exp(TemplateIf)

class Tag extends Node {

  constructor(tag, clss, id, attrs, block) {
    super()
    this.tag = tag
    this.clss = clss
    this.id = id
    this.attrs = attrs
    this.block = block
  }

  gen(indent) {
    var headerStr = "<" + this.tag + this.clss.gen(0) + this.id.gen(0) + this.attrs.gen(0) + ">"
    var hasBlock = this.block !== null
    var blockIsSingle = hasBlock && (tag.block instanceof StringNode || tag.block instanceof TemplateVar)
    var bodyStr = hasBlock ? this.block.gen(blockIsSingle ? 0 : indent + 1) : ""
    var footerStr = elk.makeStr("</" + this.tag + ">", blockIsSingle ? 0 : indent)
    var bodySeparator = blockIsSingle ? "" : "\n"
    return elk.makeStr(headerStr , indent) + (hasBlock ? (bodySeparator + bodyStr + bodySeparator + footerStr) : "")
  }

}
exp(Tag)