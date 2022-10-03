import { filter, from, iif, map, mergeMap, Observable, switchMap } from "rxjs";

export type Predicate<T> = (value: T) => boolean;

/**
 * Operator that finds the elements of the array emitted by the source Observable
 * that satisfies the given `predicate` function.
 * @param predicate Predicate function to filter the value.
 * @returns An Observable that emits values that satisfy the `predicate` function.
 */
export const spreadFind = <T>(predicate: Predicate<T>) => {
  return (source: Observable<T[]>): Observable<T> => {
    return source.pipe(
      mergeMap(arr => from([...arr])),
      filter(predicate)
    );
  }
}

/**
 * Operator that finds the first element of the array emitted by the source Observable
 * that satiasfies the given `predicate`.
 * @param predicate Predicate function to filter the value.
 * @returns An Observable that emits the value that satisfies the `predicate` function, or `undefined`.
 */
export const first = <T>(predicate: Predicate<T>) => {
  return (source: Observable<T[]>): Observable<T | undefined> => {
    return source.pipe(
      map<T[], T | undefined>(arr => arr.find(predicate))
    );
  }
}

/**
 * Operator that checks a condition per value emitted, and switches to a new Observable
 * based on the condition result. Each Observable is created from the emitted value.
 * @param condition Condition which Observable should be chosen.
 * @param trueFactory Function that creates an Observable that will be subscribed if condition is true.
 * @param falseFactory Function that creates an Observable that will be subscribed if condition is false.
 * @returns An Observable that proxies to `trueFactory` or `falseFactory`, depending on the result of the `condition` function.
 */
export const sswitch = <TSource, TResult = TSource>(
  condition: Predicate<TSource>,
  trueFactory: (value: TSource) => Observable<TResult>,
  falseFactory: (value: TSource) => Observable<TResult>
) => {
  return (source: Observable<TSource>): Observable<TResult> => {
    return source.pipe(
      switchMap(value => iif(
        () => condition(value),
        trueFactory(value),
        falseFactory(value)
      ))
    );
  }
}
