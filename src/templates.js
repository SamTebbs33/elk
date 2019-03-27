const elk = require("./elk.js");

function exp(val, name) {
    if (!name) name = val.name;
    module.exports[name] = val;
}

const templateFunctions = {};
const templates = {};
const templateDataStack = [];

function addTemplateFunction(name, args, func) {
    if (!templateFunctions[name]) templateFunctions[name] = {};
    templateFunctions[name][args.length] = {"func": func, "params": args};
}
exp(addTemplateFunction);

function getTemplateFunction(name, args) {
    if (!templateFunctions[name]) return null;
    return templateFunctions[name][args.length]
}
exp(getTemplateFunction);

function templateFunctionExists(name, args) {
    return !!getTemplateFunction(name, args);
}
exp(templateFunctionExists);

function pushDataContext(context) {
    templateDataStack.unshift(context)
}
exp(pushDataContext);

function popDataContext() {
    return templateDataStack.shift()
}
exp(popDataContext);

function peekDataContext() {
    return templateDataStack[templateDataStack.length - 1]
}
exp(peekDataContext);

function getDataFromContext(varArray, throwException) {
    if (throwException === undefined) throwException = true
    let dataStack = templateDataStack;
    let obj;
    let found = true;
    for (let i in dataStack) {
        obj = dataStack[i];
        for (let i2 in varArray) {
            const varName = varArray[i2];
            if (obj.hasOwnProperty(varName)) {
                obj = obj[varName];
                found = true;
            }
            else {
                found = false;
                break
            }
        }
        if (found) break;
    }
    if (found) return obj;
    if (throwException) throw new elk.ElkError("Undefined variable '" + varArray.join(".") + "'")
    return undefined
}
exp(getDataFromContext)

function gatherDataFromCOontext(vars) {
    
}

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
