
export const orderByDateDesc = <T extends { date: Date }>(elements: T[]) => {
  return [...elements].sort(
    ({ date: a }, { date: b }) => b.valueOf() - a.valueOf()
  );
}

export const sleep = (millis: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, millis);
  });
}
