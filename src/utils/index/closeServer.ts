import serverState from './state.js';

const closeServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!serverState.server) {
      resolve();
      return;
    }

    serverState.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

export { closeServer };
