function exp(val, name) {
    if (!name) name = val.name;
    module.exports[name] = val
}

class ElkValue {
    constructor(val) {
        this._value = val;
    }

    equals(otherValue) {
        return this.value == otherValue.value;
    }

    get value() {
        return this._value;
    }

    toString() {
        return this.value + "";
    }
}
exp(ElkValue);

class ElkEmpty extends ElkValue {
    constructor() {
        super("");
    }
}
exp(ElkEmpty);

class ElkBoolean extends ElkValue {
    constructor(val) {
        super(val);
    }
}
exp(ElkBoolean);

class ElkString extends ElkValue {
    constructor(val) {
        super(val);
    }
}
exp(ElkString);

class ElkJson extends ElkValue {
    constructor(val) {
        super(val);
    }

    toString() {
        return JSON.stringify(this.value);
    }
}
exp(ElkJson);

class ElkInteger extends ElkValue {
    constructor(val) {
        super(val);
    }
}
exp(ElkInteger);
