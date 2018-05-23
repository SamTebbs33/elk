const common = require("./common.js");

const templateFunctions = {};
const templates = {};
const templateDataStack = [];

function addTemplateFunction(name, func) {
    templateFunctions[name] = func;
}
common.exp(addTemplateFunction);

function getTemplateFunction(name) {
    return templateFunctions[name]
}
common.exp(getTemplateFunction);

function templateFunctionExists(name) {
    return !!getTemplateFunction(name);
}
common.exp(templateFunctionExists);

function addTemplate(name, params, block) {
    if (!templates[name]) templates[name] = {};
    templates[name][params.length] = {params: params, block: block}
}
common.exp(addTemplate);

function getTemplate(name, numParams) {
    return templates[name] ? templates[name][numParams] : null
}
common.exp(getTemplate);

function templateExists(name, numParams) {
    return !!getTemplate(name, numParams);
}
common.exp(templateExists);

function pushDataContext(context) {
    templateDataStack.unshift(context)
}
common.exp(pushDataContext);

function popDataContext() {
    return templateDataStack.shift()
}
common.exp(popDataContext);

function peekDataContext() {
    return templateDataStack[templateDataStack.length - 1]
}
common.exp(peekDataContext);

function getDataFromContext(varArray, throwException) {
    if (throwException === undefined) throwException = true
    let dataStack = templateDataStack;
    let obj;
    let found = true;
    for (let i in dataStack) {
        obj = dataStack[i];
        for (let i2 in varArray) {
            const varName = varArray[i2];
            if (obj.hasOwnProperty(varName)) obj = obj[varName];
            else {
                found = false;
                break
            }
        }
        if (found) break;
    }
    if (found) return obj;
    if (throwException) throw new ElkError("Undefined variable '" + varArray.join(".") + "'")
    return undefined
}
common.exp(getDataFromContext)

function dataExistsInContext(varArray) {
    return getDataFromContext(varArray, false) !== undefined
}
common.exp(dataExistsInContext)

function setDataInContext(name, value) {
    peekDataContext()[name] = value
}
common.exp(setDataInContext)

function removeDataFromContext(name) {
    delete peekDataContext()[name]
}
common.exp(removeDataFromContext)

function getTemplateDataRoot() {
    return templateDataStack[0]
}
exp(getTemplateDataRoot)