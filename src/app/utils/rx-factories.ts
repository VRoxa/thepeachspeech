import { debounceTime, distinctUntilChanged, fromEvent, map, Observable } from "rxjs";

export type ValuableHtmlElement = HTMLElement & { value: string; };

export const valueFromEvent = <T extends ValuableHtmlElement>(
  source: T,
  debounce: number = 200
): Observable<string> => {
  return fromEvent(source, 'keyup').pipe(
    map(({ currentTarget }) => currentTarget as T),
    map(({ value }) => value),
    distinctUntilChanged(),
    debounceTime(debounce)
  );
}