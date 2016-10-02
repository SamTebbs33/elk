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
    var blockIsSingle = hasBlock && tag.block.type === STATEMENT && (tag.block.node.type === STRING || (tag.block.node.type === TEMPLATE_EXPR && tag.block.node.node.type === TEMPLATE_VAR))
    var bodyStr = hasBlock ? genBlock(tag.block, blockIsSingle ? 0 : indent + 1) : ""
    var footerStr = makeStr("</" + tag.name + ">", blockIsSingle ? 0 : indent)
    var bodySeparator = blockIsSingle ? "" : "\n"
    return makeStr(headerStr , indent) + (hasBlock ? (bodySeparator + bodyStr + bodySeparator + footerStr) : "")
  }

}
exp(Tag)