type Task<T> = () => Promise<T>;

interface QueueState {
  activeCount: number;
  queuedCount: number;
  interactiveActiveCount: number;
  interactiveQueuedCount: number;
}

type Listener = (state: QueueState) => void;

class RequestQueue {
  private queue: Array<{ 
    task: Task<unknown>; 
    resolve: (val: unknown) => void; 
    reject: (err: unknown) => void;
    silent: boolean;
  }> = [];
  private activeTasks: Set<{ task: Task<unknown>; silent: boolean }> = new Set();
  private limit: number;
  private listeners: Set<Listener> = new Set();

  constructor(limit: number) {
    this.limit = Math.max(1, limit);
  }

  async add<T>(task: Task<T>, options?: { silent?: boolean }): Promise<T> {
    const silent = options?.silent ?? false;
    return new Promise((resolve, reject) => {
      this.queue.push({ task: task as Task<unknown>, resolve, reject, silent });
      this.notify();
      this.process();
    });
  }

  private async process() {
    if (this.activeTasks.size >= this.limit || this.queue.length === 0) {
      return;
    }

    const { task, resolve, reject, silent } = this.queue.shift()!;
    const activeInfo = { task, silent };
    this.activeTasks.add(activeInfo);
    this.notify();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeTasks.delete(activeInfo);
      this.notify();
      this.process();
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  get state(): QueueState {
    const activeTasksArray = Array.from(this.activeTasks);
    return {
      activeCount: this.activeTasks.size,
      queuedCount: this.queue.length,
      interactiveActiveCount: activeTasksArray.filter(t => !t.silent).length,
      interactiveQueuedCount: this.queue.filter(t => !t.silent).length,
    };
  }
}

// Singleton instance
const maxConcurrent = parseInt(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS || '1', 10);
export const requestQueue = new RequestQueue(maxConcurrent);
