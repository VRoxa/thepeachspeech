import { filter, from, map, mergeMap, Observable } from "rxjs";

export type Predicate<T> = (value: T) => boolean;

/**
 * Operator that finds the elements of the array emitted by the source Observable
 * that satisfies the given predicate.
 * @param predicate Predicate function to filter the value.
 * @returns An observable that emits values that satisfy the predicate function.
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
 * that satiasfies the given predicate.
 * @param predicate Predicate function to filter the value.
 * @returns An observable that emits the value that satisfies the predicate function, or undefined.
 */
export const first = <T>(predicate: Predicate<T>) => {
  return (source: Observable<T[]>): Observable<T | undefined> => {
    return source.pipe(
      map<T[], T | undefined>(arr => arr.find(predicate))
    );
  }
}
