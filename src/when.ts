type ChainedWhen<T, R> = {
  on: <A>(pred: (v: T) => boolean, fn: () => A) => ChainedWhen<T, R | A>;
  else: <A>(fn: () => A) => R | A;
};

const match = <T, R>(val: any): ChainedWhen<T, R> => ({
  on: <A>(pred: (v: T) => boolean, fn: () => A) => match<T, R | A>(val),
  else: <A>(fn: () => A): A | R => val,
});

const chain = <T, R>(val: T): ChainedWhen<T, R> => ({
  on: <A>(pred: (v: T) => boolean, fn: () => A) =>
    pred(val) ? match(fn()) : chain<T, A | R>(val),
  else: <A>(fn: () => A) => fn(),
});

export const when = <T>(val: T) => ({
  on: <A>(pred: (v: T) => boolean, fn: () => A) =>
    pred(val) ? match<T, A>(fn()) : chain<T, A>(val),
});
