import { debounceTime, filter, fromEvent, map, Observable, tap } from "rxjs";

export type ValuableHtmlElement = HTMLElement & { value: string; };

export const valueFromEvent = <T extends ValuableHtmlElement>(source: T, debounce: number = 200): Observable<string> => {
  let lastValue: string;

  return fromEvent(source, 'keyup').pipe(
    map(({ currentTarget }) => currentTarget as T),
    map(({ value }) => value),
    filter(value => value !== lastValue),
    tap(value => lastValue = value),
    debounceTime(debounce)
  )
}