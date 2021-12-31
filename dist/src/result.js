"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = void 0;
var fp_ts_1 = require("fp-ts");
var Option_1 = require("fp-ts/lib/Option");
var immutable_1 = require("immutable");
var Result = (function () {
    function Result(value, errors) {
        this.DEFAULT_ERROR_MESSAGE = 'Unexpcted error be thrown on applying operator';
        this._value = value ? fp_ts_1.option.of(value) : Option_1.none;
        this._errors = errors ? errors : [];
    }
    Object.defineProperty(Result.prototype, "errors", {
        get: function () {
            return (0, immutable_1.List)(this._errors);
        },
        enumerable: false,
        configurable: true
    });
    Result.prototype.addError = function (message) {
        this._errors.push(message);
        return this;
    };
    Result.prototype.isFailure = function () {
        return this instanceof Failure;
    };
    Result.prototype.isSuccess = function () {
        return !this.isFailure();
    };
    Result.prototype.onFailure = function (message, consumer) {
        if (this.isSuccess()) {
            return this;
        }
        if (message) {
            this._errors.push(message);
        }
        if (consumer && isError(this._value)) {
            consumer(this._value);
        }
        return this;
    };
    Result.prototype.onSuccess = function (consumer) {
        if (fp_ts_1.option.isSome(this._value)) {
            consumer(this._value.value);
        }
        return this;
    };
    Result.prototype.fold = function (onSuccess, onFailure) {
        if (this.isSuccess()) {
            if (fp_ts_1.option.isSome(this._value)) {
                return onSuccess(this._value.value);
            }
        }
        if (fp_ts_1.option.isSome(this._value) && isError(this._value.value)) {
            return onFailure(this._value.value);
        }
        throw new Error(this.DEFAULT_ERROR_MESSAGE);
    };
    Result.prototype.map = function (transform) {
        if (this.isSuccess()) {
            if (fp_ts_1.option.isSome(this._value)) {
                return new Result(transform(this._value.value));
            }
            return new Result(transform());
        }
        if (fp_ts_1.option.isSome(this._value) && isError(this._value.value)) {
            var v = this._value.value;
            return new Failure(v);
        }
        throw new Error(this.DEFAULT_ERROR_MESSAGE);
    };
    Result.prototype.getOrThrow = function (e) {
        if (this.isSuccess() && fp_ts_1.option.isSome(this._value)) {
            return this._value.value;
        }
        if (e) {
            throw e;
        }
        this.throwOnFailure();
    };
    Result.prototype.getOrDefault = function (elseValue) {
        if (this.isSuccess() && fp_ts_1.option.isSome(this._value)) {
            return this._value.value;
        }
        return elseValue;
    };
    Result.prototype.getOrElse = function (onFailure) {
        var _this = this;
        return this.fold(function () {
            return (0, Option_1.getOrElse)(function () { return null; })(_this._value);
        }, function () {
            var e = _this._value;
            return onFailure(e);
        });
    };
    Result.prototype.throwOnFailure = function () {
        if (isError(this._value)) {
            throw this._value;
        }
    };
    Result.runCatching = function (supplier) {
        try {
            return new Result(supplier());
        }
        catch (e) {
            return new Failure(e);
        }
    };
    return Result;
}());
exports.Result = Result;
var isError = function (arg) {
    return typeof arg === 'object' && 'name' in arg && 'message' in arg;
};
var Failure = (function (_super) {
    __extends(Failure, _super);
    function Failure(_error) {
        var _this = _super.call(this, _error) || this;
        _this._error = _error;
        if (!isError(_error)) {
            throw new Error('Failure must have the value of Error.');
        }
        return _this;
    }
    Object.defineProperty(Failure.prototype, "error", {
        get: function () {
            return this._error;
        },
        enumerable: false,
        configurable: true
    });
    return Failure;
}(Result));
//# sourceMappingURL=result.js.map