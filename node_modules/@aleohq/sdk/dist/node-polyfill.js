import { webcrypto } from 'node:crypto';
import * as $fs from 'node:fs';
import $mime from 'mime/lite.js';
import $request from 'sync-request';

if (globalThis.crypto == null) {
    globalThis.crypto = webcrypto;
}

const oldFetch = globalThis.fetch;
// We always polyfill fetch because Node's fetch doesn't support file URLs.
globalThis.fetch = async function (resource, options) {
    const request = new Request(resource, options);
    const url = new URL(request.url);
    if (url.protocol === "file:") {
        const readStream = $fs.createReadStream(url);
        const headers = {};
        const type = $mime.getType(url.pathname);
        if (type) {
            headers["Content-Type"] = type;
        }
        return new Response(readStream, {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
    else {
        return await oldFetch(request);
    }
};

globalThis.XMLHttpRequest = class extends EventTarget {
    static UNSENT = 0;
    static OPENED = 1;
    static HEADERS_RECEIVED = 2;
    static LOADING = 3;
    static DONE = 4;
    UNSENT = XMLHttpRequest.UNSENT;
    OPENED = XMLHttpRequest.OPENED;
    HEADERS_RECEIVED = XMLHttpRequest.HEADERS_RECEIVED;
    LOADING = XMLHttpRequest.LOADING;
    DONE = XMLHttpRequest.DONE;
    responseType;
    withCredentials;
    timeout;
    readyState;
    response;
    responseText;
    responseURL;
    responseXML;
    status;
    statusText;
    upload;
    _url;
    _mime;
    constructor() {
        super();
        this._reset();
        this._mime = "text/xml";
    }
    _reset() {
        this.readyState = XMLHttpRequest.UNSENT;
        this.response = null;
        this.responseText = "";
        this.responseType = "";
        this.responseURL = "";
        this.responseXML = null;
        this.status = 0;
        this.statusText = "";
        this.timeout = 0;
        this.upload = null;
        this.withCredentials = false;
        this._url = null;
    }
    _success() {
        this.readyState = XMLHttpRequest.DONE;
        this.status = 200;
        this.statusText = "OK";
    }
    set onabort(value) {
        throw new Error("Not implemented");
    }
    set onerror(value) {
        throw new Error("Not implemented");
    }
    set onreadystatechange(value) {
        throw new Error("Not implemented");
    }
    set onloadstart(value) {
        throw new Error("Not implemented");
    }
    set onload(value) {
        throw new Error("Not implemented");
    }
    set onloadend(value) {
        throw new Error("Not implemented");
    }
    set onprogress(value) {
        throw new Error("Not implemented");
    }
    set ontimeout(value) {
        throw new Error("Not implemented");
    }
    abort() {
        throw new Error("Not implemented");
    }
    overrideMimeType(mime) {
        this._mime = mime;
    }
    getResponseHeader() {
        throw new Error("Not implemented");
    }
    getAllResponseHeaders() {
        throw new Error("Not implemented");
    }
    setRequestHeader() {
        throw new Error("Not implemented");
    }
    open(method, url, async = true, username, password) {
        if (async) {
            throw new Error("Async XMLHttpRequest is not implemented yet");
        }
        if (method !== "GET") {
            throw new Error("Non-GET requests are not implemented yet");
        }
        this._reset();
        this._url = url;
    }
    send(body = null) {
        if (body !== null) {
            throw new Error("XMLHttpRequest send body is not implemented yet");
        }
        if (!this._url) {
            throw new Error("You must call open before you call send");
        }
        const response = $request("GET", this._url, {
            headers: {
                "Content-Type": this._mime,
            }
        });
        const buffer = response.body.buffer;
        const responseText = new TextDecoder("iso-8859-5", { fatal: true }).decode(buffer);
        this.response = this.responseText = responseText;
        this._url = null;
        this._success();
    }
};

function patch($worker, $os) {
    // This is technically not a part of the Worker polyfill,
    // but Workers are used for multi-threading, so this is often
    // needed when writing Worker code.
    if (globalThis.navigator == null) {
        globalThis.navigator = {
            hardwareConcurrency: $os.cpus().length,
        };
    }
    globalThis.Worker = class Worker extends EventTarget {
        _worker;
        constructor(url, options) {
            super();
            if (url instanceof URL) {
                if (url.protocol !== "file:") {
                    throw new Error("Worker only supports file: URLs");
                }
                url = url.href;
            }
            else {
                throw new Error("Filepaths are unreliable, use `new URL(\"...\", import.meta.url)` instead.");
            }
            if (!options || options.type !== "module") {
                throw new Error("Workers must use \`type: \"module\"\`");
            }
            // This uses some funky stuff like `patch.toString()`.
            //
            // This is needed so that it can synchronously run the polyfill code
            // inside of the worker.
            //
            // It can't use `require` because the file doesn't have a `.cjs` file extension.
            //
            // It can't use `import` because that's asynchronous, and the file path
            // might be different if using a bundler.
            const code = `
                ${patch.toString()}

                // Inject the polyfill into the worker
                patch(require("node:worker_threads"), require("node:os"));

                const { workerData } = require("node:worker_threads");

                // This actually loads and runs the worker file
                import(workerData.url)
                    .catch((e) => {
                        // TODO maybe it should send a message to the parent?
                        console.error(e.stack);
                    });
            `;
            this._worker = new $worker.Worker(code, {
                eval: true,
                workerData: {
                    url,
                },
            });
            this._worker.on("message", (data) => {
                this.dispatchEvent(new MessageEvent("message", { data }));
            });
            this._worker.on("messageerror", (error) => {
                throw new Error("UNIMPLEMENTED");
            });
            this._worker.on("error", (error) => {
                // TODO attach the error to the event somehow
                const event = new Event("error");
                this.dispatchEvent(event);
            });
        }
        set onmessage(f) {
            throw new Error("UNIMPLEMENTED");
        }
        set onmessageerror(f) {
            throw new Error("UNIMPLEMENTED");
        }
        set onerror(f) {
            throw new Error("UNIMPLEMENTED");
        }
        postMessage(value, transfer) {
            this._worker.postMessage(value, transfer);
        }
        terminate() {
            this._worker.terminate();
        }
        // This is Node-specific, it allows the process to exit
        // even if the Worker is still running.
        unref() {
            this._worker.unref();
        }
    };
    if (!$worker.isMainThread) {
        const globals = globalThis;
        // This is used to create the onmessage, onmessageerror, and onerror setters
        const makeSetter = (prop, event) => {
            let oldvalue;
            Object.defineProperty(globals, prop, {
                get() {
                    return oldvalue;
                },
                set(value) {
                    if (oldvalue) {
                        globals.removeEventListener(event, oldvalue);
                    }
                    oldvalue = value;
                    if (oldvalue) {
                        globals.addEventListener(event, oldvalue);
                    }
                },
            });
        };
        // This makes sure that `f` is only run once
        const memoize = (f) => {
            let run = false;
            return () => {
                if (!run) {
                    run = true;
                    f();
                }
            };
        };
        // We only start listening for messages / errors when the worker calls addEventListener
        const startOnMessage = memoize(() => {
            $worker.parentPort.on("message", (data) => {
                workerEvents.dispatchEvent(new MessageEvent("message", { data }));
            });
        });
        const startOnMessageError = memoize(() => {
            throw new Error("UNIMPLEMENTED");
        });
        const startOnError = memoize(() => {
            $worker.parentPort.on("error", (data) => {
                workerEvents.dispatchEvent(new Event("error"));
            });
        });
        // Node workers don't have top-level events, so we have to make our own
        const workerEvents = new EventTarget();
        globals.close = () => {
            process.exit();
        };
        globals.addEventListener = (type, callback, options) => {
            workerEvents.addEventListener(type, callback, options);
            if (type === "message") {
                startOnMessage();
            }
            else if (type === "messageerror") {
                startOnMessageError();
            }
            else if (type === "error") {
                startOnError();
            }
        };
        globals.removeEventListener = (type, callback, options) => {
            workerEvents.removeEventListener(type, callback, options);
        };
        function postMessage(value, transfer) {
            $worker.parentPort.postMessage(value, transfer);
        }
        globals.postMessage = postMessage;
        makeSetter("onmessage", "message");
        makeSetter("onmessageerror", "messageerror");
        makeSetter("onerror", "error");
    }
}
async function polyfill() {
    const [$worker, $os] = await Promise.all([
        import('node:worker_threads'),
        import('node:os'),
    ]);
    patch($worker, $os);
}
if (globalThis.Worker == null) {
    await polyfill();
}

if (!globalThis.self) {
    globalThis.self = globalThis;
}
//# sourceMappingURL=node-polyfill.js.map
