class ElkValue {
    constructor(val) {
        this._value = val;
    }

    get value() {
        return this._value;
    }

    toHtml() {
        return this.value + "";
    }
}

class ElkEmpty extends ElkValue {
    constructor() {
        super("");
    }
}

class ElkBoolean extends ElkValue {
    constructor(val) {
        super(val);
    }
}

class ElkString extends ElkValue {
    constructor(val) {
        super(val);
    }
}

class ElkJson extends ElkValue {
    constructor(val) {
        super();
    }

    toString() {
        return JSON.stringify(this.value);
    }
}