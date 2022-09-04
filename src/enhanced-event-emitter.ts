import { EventEmitter } from 'events';

class EnhancedEventEmitter extends EventEmitter {
  protected _logger: any;

  constructor(logger?: any) {
    super();
    this.setMaxListeners(Infinity);

    this._logger = logger || console;
  }

  safeEmit(event: string | symbol, ...args: any[]) {
    try {
      this.emit(event, ...args);
    } catch (error) {
      this._logger.error(
        'safeEmit() | event listener threw an error [event:%s]:%o',
        event,
        error,
      );
    }
  }

  async safeEmitAsPromise(event: string | symbol, ...args: any[]) {
    return new Promise((resolve, reject) => {
      this.safeEmit(event, ...args, resolve, reject);
    });
  }
}

export default EnhancedEventEmitter;
