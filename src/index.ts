import { EVENT } from './constant';
import EnhancedEventEmitter from './enhanced-event-emitter';
import Retry from './retry';

interface WebSocketTransportSpec {
  url: string;
  binaryType: BinaryType;
}

interface IWebSocketTransport {
  opened: boolean;
  /**
   * disconnected, maybe need retry.
   */
  disconnected: boolean;

  closed: boolean;

  connect: () => Promise<void>;

  message: (data: any) => void;

  close: () => void;

  reconnect: () => Promise<void>;
}

class WebSocketTransport extends EnhancedEventEmitter implements IWebSocketTransport {
  private _websocket: WebSocket | null = null;

  private _url: string;

  private _binaryType: BinaryType;

  private _opened: boolean = false;

  private _disconnected: boolean = true;

  private _closed: boolean = true;

  private _connectTimer: NodeJS.Timer | null = null;

  private _connectTimeOut: number = 10000;

  // reconnect
  private _positiveClose: boolean = false;

  private _notFirstConnected: boolean = false;

  constructor(spec: WebSocketTransportSpec) {
    super();

    this._url = spec.url;
    this._binaryType = spec.binaryType;
  }

  public get opened() {
    return this._opened;
  }

  public get disconnected() {
    return this._disconnected;
  }

  public get closed() {
    return this._closed;
  }

  async connect() {
    return new Promise<void>((resolve, reject) => {
      try {
        this._websocket = new WebSocket(this._url);
        this._websocket.binaryType = this._binaryType;

        this._onOpen(() => {
          this._clearFirstConnectTimer();
          this._notFirstConnected = true;
          resolve();
        });

        this._connectTimer = setTimeout(() => {
          this._connectTimer = null;
          if (!this._opened) {
            reject(new Error('connect time out!'));
          }
        }, this._connectTimeOut);
      } catch (err) {
        reject(err);
      }
    });
  }

  message(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (!this._websocket) {
      throw new Error('websocket is empty!');
    }

    this._websocket.send(data);
  }

  close() {
    if (!this._websocket) {
      console.warn('close() | websocket is empty!');
      return;
    }
    if (this._closed) {
      console.warn('close() | websocket is closed already!');
      return;
    }

    this._closed = true;
    this._opened = false;
    this._disconnected = true;
    this._positiveClose = true;
    this._websocket.close();
  }

  async reconnect() {
    if (this._opened) {
      this.close();
      return;
    }

    const retry = new Retry();

    return new Promise<void>((resolve, reject) => {
      retry.do(() => {
        if (!retry.retry(!this._opened)) {
          return;
        }

        this.connect().then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    });
  }

  _onOpen(cb?: () => void) {
    this._websocket?.addEventListener('open', () => {
      this._opened = true;
      this._closed = false;
      this._disconnected = false;


      if (this._notFirstConnected) {
        this.safeEmit(EVENT.RECONNECT);
      } else {
        this.safeEmit(EVENT.OPEN);
      }

      cb && cb();
    });
  }

  _onMessage() {
    this._websocket?.addEventListener('message', (data) => {
      this.safeEmit(EVENT.MESSAGE, data);
    });
  }

  _onError() {
    this._websocket?.addEventListener('error', () => {
      this.safeEmit(EVENT.ERROR);
    });
  }

  _onClose() {
    this._websocket?.addEventListener('close', () => {
      this._opened = false;
      this.safeEmit(EVENT.CLOSE);

      // reconnect.
      if (this._positiveClose) {
        this._closed = true;
        return;
      }

      this._disconnected = true;
      this.reconnect();
    });
  }

  _clearFirstConnectTimer() {
    if (this._connectTimer) {
      clearTimeout(this._connectTimer);
    }
  }
}

export default WebSocketTransport;
