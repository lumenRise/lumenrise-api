const awaitDomainPhase = async <T,>(phase: Promise<T>, deadline: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      phase,
      new Promise<never>((_resolve, reject): void => {
        timer = setTimeout(
          (): void => reject(new Error('Domain request timed out')),
          Math.max(1, deadline - Date.now()),
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

export default awaitDomainPhase;
