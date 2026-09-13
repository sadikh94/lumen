type QueueTask<T> = {
  key: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const MAX_CONCURRENT = 2;
const MIN_REQUEST_INTERVAL = 150;

let activeRequests = 0;
let lastRequestStartedAt = 0;
let isDraining = false;

const queue: QueueTask<unknown>[] = [];
const pendingRequests = new Map<string, Promise<unknown>>();

const wait = (milliseconds: number) => (
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  })
);

const drainQueue = async () => {
  if (isDraining) {
    return;
  }

  isDraining = true;

  try {
    while (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
      const elapsed = Date.now() - lastRequestStartedAt;
      const delay = Math.max(0, MIN_REQUEST_INTERVAL - elapsed);

      if (delay > 0) {
        await wait(delay);
      }

      if (activeRequests >= MAX_CONCURRENT || queue.length === 0) {
        continue;
      }

      const task = queue.shift();

      if (!task) {
        continue;
      }

      activeRequests += 1;
      lastRequestStartedAt = Date.now();

      void task.execute()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          activeRequests -= 1;
          pendingRequests.delete(task.key);
          void drainQueue();
        });
    }
  } finally {
    isDraining = false;

    if (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
      void drainQueue();
    }
  }
};

export const enqueueRatingRequest = <T>(
  key: string,
  execute: () => Promise<T>,
): Promise<T> => {
  const existingRequest = pendingRequests.get(key);

  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const promise = new Promise<T>((resolve, reject) => {
    queue.push({
      key,
      execute,
      resolve,
      reject,
    } as QueueTask<unknown>);

    void drainQueue();
  });

  pendingRequests.set(key, promise);

  return promise;
};
