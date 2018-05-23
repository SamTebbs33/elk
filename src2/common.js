function exp(val, name) {
    if (!name) name = val.name;
    module.exports[name] = val
}

// This is weird
exp(exp);