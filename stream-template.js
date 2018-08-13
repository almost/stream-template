"use strict";
const { finished, PassThrough, Readable } = require("readable-stream");

// Use template literals to allow a template where the variables are streams,
// the output as a whole is also a stream.
function makeForEncoding(encoding) {
  return function StreamTemplate(strings, ...interpolations) {
    let queue = [],
      stringBuffer = [],
      destroyed = false,
      awaitingPromise = false,
      currentStream = null,
      wantsData = false,
      currentStreamHasData = false,
      readable = null;

    function forwardDestroy(streamOrPromise) {
      if (isStream(streamOrPromise)) {
        finished(streamOrPromise, err => {
          if (err) {
            readable.destroy(err);
          }
        });
      } else {
        streamOrPromise.catch(err => {
          readable.destroy(err);
        });
      }
    }

    function read() {
      if (destroyed) {
        return;
      }
      wantsData = true;
      if (currentStream) {
        if (currentStreamHasData) {
          currentStreamHasData = false;
          const chunk = currentStream.read();
          if (chunk != null) {
            if (readable.push(chunk) === false) {
              wantsData = false;
            }
          }
        }
        return;
      }
      if (awaitingPromise) {
        return;
      }
      while (!destroyed) {
        if (queue.length === 0) {
          if (stringBuffer.length) {
            const toWrite = Buffer.concat(stringBuffer);
            stringBuffer.length = 0;
            if (readable.push(toWrite) === false) {
              return;
            }
          }
          readable.push(null);
          break;
        }
        let item = queue.shift();
        if (item != null) {
          if (typeof item === "string") {
            // Combine plain strings together to avoid extra chunks
            stringBuffer.push(Buffer.from(`${item}`, encoding));
          } else if (Array.isArray(item)) {
            queue = item.concat(queue);
          } else if (Buffer.isBuffer(item)) {
            stringBuffer.push(item);
            // stream or Promise
          } else {
            if (stringBuffer.length) {
              queue.unshift(item);
              const toWrite = Buffer.concat(stringBuffer);
              stringBuffer.length = 0;
              if (readable.push(toWrite) !== false) {
                read();
              }
              return;
            }
            if (isStream(item)) {
              currentStream = new PassThrough();
              currentStreamHasData = false;
              item.pipe(currentStream);
              currentStream.once("end", () => {
                currentStream = null;
                if (wantsData) {
                  read();
                }
              });
              currentStream.on("readable", () => {
                currentStreamHasData = true;
                if (wantsData) {
                  read();
                }
              });
              currentStreamHasData = true;
              read();
            } else {
              // Promise!
              awaitingPromise = true;
              item.then(result => {
                awaitingPromise = false;
                queue.unshift(result);
                read();
              });
            }
            // Exit out of this loop (we'll have called read again if needed)
            return;
          }
        }
      }
    }

    function destroy(err) {
      if (destroyed) {
        return;
      }
      destroyed = true;

      for (let i = 0; i < interpolations.length; i++) {
        const interpolation = interpolations[i];
        if (isStream(interpolation)) {
          interpolation.destroy();
        }
      }

      if (err) {
        readable.emit("error", err);
      }
      readable.emit("close");
    }

    queue.push(strings[0]);
    for (let i = 0; i < interpolations.length; i++) {
      const interpolation = interpolations[i];
      // If is stream or Promise, error handle right away
      if (isStream(interpolation) || isPromise(interpolation)) {
        forwardDestroy(interpolation);
      }
      queue.push(interpolation);
      queue.push(strings[i + 1]);
    }

    readable = new Readable({ read, destroy });
    return readable;
  };
}

function isStream(stream) {
  return stream != null && stream.pipe != null;
}

function isPromise(promise) {
  return promise != null && promise.then != null;
}

module.exports = makeForEncoding("utf8");
module.exports.encoding = makeForEncoding;
