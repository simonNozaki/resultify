/* eslint-disable new-cap */
import {option} from 'fp-ts';
import {pipe} from 'fp-ts/lib/function';
import {none, Option, getOrElse, toNullable, match} from 'fp-ts/lib/Option';
import {ValueNotFoundException} from './error';
import {when} from './when';

/**
 * Top Level shorthand for `Resultt.runCatching(() => ())` .
 * Force the first type parameter type of Error
 * when the action result catch Error.
 * @param {()} supplier function to be called
 * @return {Resultt<any, any>} The result of execution in argument supplier.
 */
export const runCatching = <T>(supplier: () => T): Resultt<T> => {
  try {
    return new Resultt<T>(supplier());
  } catch (e) {
    return new Failure<T>(e);
  }
};

/**
 * Base class for runtime result.
 * This class may express the context for a runtime and its result. <br>
 * Highly inspired by Kotlin Result/runCatching.
 *
 * @param {T} T Type parameter for main value.
 * @see usage ... test/appliation/result-test.ts
 */
export class Resultt<T> {
  /** Successed data of this object */
  private readonly _value: Option<T>;

  constructor()
  constructor(value: T)
  /**
   * @param {T} value
   * @param {E[]} errors
   */
  constructor(value?: T) {
    this._value = value ? option.of(value) : none;
  }

  /**
   * Create Failure instance manually
   * @param {Error} error error
   * @return {Failure} Failure
   */
  static failure(error: Error): Failure<Error> {
    return new Failure(error);
  }

  /**
   * Return true if the result was failed.
   * @return {boolean}
   */
  isFailure(): boolean {
    return this instanceof Failure;
  }

  /**
   * Return true if the result was successed.
   * @return {boolean}
   */
  isSuccess(): boolean {
    return !this.isFailure();
  }

  /**
   * Set action on failure.
   * @param {()} consumer action on failure.
   * @return {Resultt<T, E>}
   */
  onFailure(consumer?: (it?: Error) => void): Resultt<T> {
    if (this.isSuccess()) {
      return this;
    }
    // call argument consumer with the error of Failure instance
    if (consumer && option.isSome(this._value) && isError(this._value.value)) {
      consumer(this._value.value);
      return this;
    }
    throw new Error('The value of the instance is invalid.');
  }

  /**
   * Set an additional action on successing
   * @param {()} consumer
   * @return {Resultt<T, E>}
   */
  onSuccess(consumer: (arg: T) => void): Resultt<T> {
    if (this.isFailure()) {
      return this;
    }
    if (option.isSome(this._value)) {
      consumer(this._value.value);
    }
    return this;
  }

  /**
   * Map the value of this result to another instance typed R.
   * If this function cannot return another instance, throw Error.
   * @param {function} onSuccess higher kinded function for succesing
   * @param {function} onFailure higher kinded function for failing
   * @param {R} R Type parameter folded to
   * @return {R}
   */
  fold<R>(
      onSuccess: (value?: T) => R,
      onFailure: (earg?: Error) => R,
  ): R {
    if (this.isSuccess()) {
      return pipe(
          this._value,
          match(
              () => {
                return onSuccess();
              },
              (t: T) => {
                return onSuccess(t);
              },
          ),
      );
    }
    return pipe(
        this._value,
        match(
            () => {
              return onFailure();
            },
            (e: T) => {
              const err: unknown = e as unknown;
              return onFailure(err as Error);
            },
        ),
    );
  }

  /**
   * Map the result to another result, transforming by the argument.
   * @param {function} transform callback function for mapping another Result.
   * @return {Resultt<R, E>}
   */
  map<R>(transform: (arg?: T) => R): Resultt<R> {
    if (this.isSuccess()) {
      if (option.isSome(this._value)) {
        return new Resultt<R>(transform(this._value.value));
      }
      return new Resultt<R>(transform());
    }
    if (option.isSome(this._value) && isError(this._value.value)) {
      const v: unknown = this._value.value as unknown;
      return new Failure<R>(v as R);
    }
    throw new Error('Map cannot apply for the value of this class');
  }

  /**
   * Map the result to another result, transforming by the argument.
   * `mapCatching` handle errors on executing the argument `transform`.
   * @param {function} transform callback function for mapping another Result.
   * @return {Resultt<R, E>}
   */
  mapCatching<R>(transform: (arg?: T) => R): Resultt<R> {
    if (this.isSuccess()) {
      const optionalValue = option.isSome(this._value) ?
        this._value.value : null;
      return Resultt.runCatching(() => transform(optionalValue));
    }
    if (this.isFailure() && option.isSome(this._value)) {
      const v: unknown = this._value.value as unknown;
      return new Failure<R>(v as R);
    }
    throw new Error('Map cannot apply for the value of this class');
  }

  /**
   * Process a passed callback function and rerturn value
   * if this `Resultt` is failure, so there is nothing happenning when this
   * is success.
   * @param {function} transform callback function for mapping another Result.
   * @return {Resultt<R>}
   */
  recover<R>(transform: (arg?: Error) => R): Resultt<R> {
    if (this instanceof Failure) {
      return new Resultt(transform(this.error));
    }
    if (this.isSuccess() && option.isSome(this._value)) {
      const v: unknown = this._value.value as unknown;
      return new Resultt<R>(v as R);
    }
    throw new Error('"Recover" cannot apply for the value of this class');
  }

  /**
   * Process a passed callback function and rerturn value
   * if this `Resultt` is failure.
   *
   * Noet: {@link recover} is different from this method at the point that
   * {@link recoverCatching} does not throw an error
   * on processing a callback function.
   * @param {function} transform callback function for mapping another Result.
   * @return {Resultt<R>}
   */
  recoverCatching<R>(transform: (arg?: Error) => R): Resultt<R> {
    if (this instanceof Failure) {
      const e = this.error;
      return Resultt.runCatching(() => transform(e));
    }
    if (this.isSuccess() && option.isSome(this._value)) {
      const v: unknown = this._value.value as unknown;
      return new Resultt<R>(v as R);
    }
    throw new Error('"Recover" cannot apply for the value of this class');
  }

  /**
   * Return [Failure] if the argument `predicate` is evaluated as false.
   * Internally the method `filter` throws runtime Error
   * `ValueNotFoundException` if the predicate is false.
   * @param {Function} predicate
   * @return {Resultt<T>}
   */
  filter(predicate: (t: T) => boolean): Resultt<T> {
    if (this.isSuccess()) {
      return pipe(
          this._value,
          match(
              () => (this.getFailure('The value is not found.')),
              (t: T) => {
                return when(t)
                    .on((v) => predicate(v), () => new Resultt(t))
                    .else(() => (this.getFailure('The value is not found.')));
              },
          ),
      );
    }
    return this;
  }

  /**
   * Return [Failure] if a value of this `Resultt` instance is null;
   * @return {Resultt<T>}
   */
  filterNotNull(): Resultt<T> {
    return pipe(
        this._value,
        match(
            () => (this.getFailure('The value is null')),
            (t: T) => (new Resultt(t)),
        ),
    );
  }

  /**
   * Return Resultt instance with doing `consumer`.
   * @param {Function} consumer
   * @return {Resultt<T>}
   */
  andLastly(consumer: () => void): Resultt<T> {
    consumer();
    return this;
  }

  /**
   * Get a value of this result or throw error if not.
   * @param {Error} e Some Error if want.
   * No parameter passed throw default Error.
   * @return {T}
   */
  getOrThrow(e?: Error): T {
    if (this.isSuccess() && option.isSome(this._value)) {
      return this._value.value;
    }
    if (e) {
      throw e;
    }
    this.throwOnFailure();
  }

  /**
   * Get the value of this result or default value in argument
   * @param {T} elseValue
   * @return {T}
   */
  getOrDefault(elseValue: T): T {
    if (this.isSuccess() && option.isSome(this._value)) {
      return this._value.value;
    }
    return elseValue;
  }

  /**
   * Get the value of type R by applying action.
   * Shorthand for the method `fold`.
   * @param {function} onFailure the action on failure
   * @return {R}
   */
  getOrElse<R>(onFailure: (earg?: Error) => R): R {
    return this.fold(
        () => {
          return getOrElse(() => null)(this._value);
        },
        () => {
          const e: unknown = this._value as unknown;
          return onFailure(e as Error);
        },
    );
  }

  /**
   * Get the encapsulated value of this class instance if success.
   * @return {T | null}
   */
  getOrNull(): T | null {
    return when(this)
        .on((v: Resultt<T>) => v.isSuccess(), () =>
          (pipe(
              toNullable(this._value),
          )),
        )
        .else(() => null);
  }

  /**
   * Return the string expression of this class instance.
   * @return {string}
   */
  toString(): string {
    return `Success${this._value}`;
  }

  /**
   * @return {void}
   */
  private throwOnFailure(): void {
    if (this.isFailure() && option.isSome(this._value)) {
      throw this._value.value;
    }
  }

  /**
   * Get `Failure` instance initialized with `ValueNotFoundException` .
   * @param {string} message
   * @return {Failure<T>}
   */
  private getFailure = <T>(message: string): Failure<T> => {
    const e: unknown = new ValueNotFoundException(message);
    return new Failure<T>(e as T);
  };

  /**
   * Wrapping actions and return Result instance.
   * Force the first type parameter type of Error
   * when the action result catch Error.
   * @param {()} supplier function to be called
   * @return {Resultt<any, any>} The result of execution in argument supplier.
   */
  static runCatching<T>(supplier: () => T): Resultt<T> {
    return runCatching(supplier);
  }
}

const isError = (arg: unknown): arg is Error => {
  return typeof arg === 'object' && 'name' in arg && 'message' in arg;
};

/**
 * Result of failure. This class is instanciated on catching an error
 */
class Failure<Error> extends Resultt<Error> {
  /**
   * @param {Error} _error
   */
  constructor(private _error: Error) {
    super(_error);
    if (!isError(_error)) {
      throw new Error('Failure must have the value of Error.');
    }
  }
  /**
   * @return {Error}
   */
  get error(): Error {
    return this._error;
  }
  /**
   * always return [Failure].
   * @override filter
   * @param {Function} predicate
   * @return {Resultt<T>}
   */
  filter(predicate: (t: Error) => boolean): Resultt<Error> {
    return this;
  }
  /**
   * Return Resultt instance with doing `consumer`.
   * @param {Function} consumer
   * @return {Resultt<Error>}
   */
  andLastly(consumer: () => void): Resultt<Error> {
    consumer();
    return this;
  }
  /**
   * @return {string}
   */
  toString(): string {
    return `Error${this._error}`;
  }
}
