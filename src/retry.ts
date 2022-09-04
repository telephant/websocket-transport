interface IRetry {
  do: (fn: () => void) => void;

  retry: (needRetry: boolean) => void;

  cancel: () => void;
}

interface RetrySpecs {
  maxRetryTimes?: number;
  retryDelay?: number;
}

class Retry implements IRetry {
  private _maxRetryTimes: number;

  private _retryDelay: number;

  private _curRetryTimes: number = 0;

  private _isNeedRetry: boolean = false;

  private _retryTimer: NodeJS.Timer | null = null;

  constructor(spec?: RetrySpecs) {
    this._retryDelay = spec?.retryDelay ?? 5000;
    this._maxRetryTimes = spec?.maxRetryTimes ?? 3;
  }

  do(fn: () => void) {
    if (!this._isNeedRetry) {
      return;
    }

    if (this._curRetryTimes >= this._maxRetryTimes) {
      console.error('retry.do() | max retry times', this._maxRetryTimes);
      return;
    }

    fn();
    this._curRetryTimes++;

    // retry.
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this.do(fn);
    }, this._retryDelay);
  }

  retry(needRetry: boolean) {
    this._isNeedRetry = needRetry;
    if (!needRetry) {
      this.cancel();
    }
    return needRetry;
  }

  cancel() {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
    }
  }
}

export default Retry;
