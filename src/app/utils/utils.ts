
export const orderByDateDesc = <T extends { date: Date }>(elements: T[]) => {
  return [...elements].sort(
    ({ date: a }, { date: b }) => b.valueOf() - a.valueOf()
  );
}
