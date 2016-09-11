'use strict';
var stream = require('readable-stream');
var PassThrough = stream.PassThrough;
var Readable = stream.Readable;

// Use template literals to allow a template where the variables are streams,
// the output as a whole is also a stream.
function makeForEncoding(encoding) {
  return function StreamTemplate(strings, ...iterpolations) {
    let queue = [], stringBuffer = [], shouldContinue = true,
        awaitingPromise = false,
        currentStream = null, wantsData = false, currentStreamHasData = false;

    function read(size) {
      wantsData = true;
      if (currentStream) {
        if (currentStreamHasData) {
          currentStreamHasData = false;
          let chunk = currentStream.read();
          if (chunk != null) {
            if (readable.push(chunk) === false) {
              wantsData = false;
            }
          }
        }
        return;
      }
      if (awaitingPromise) return;
      while (true) {
        if (queue.length === 0) {
          if (stringBuffer.length) {
            let toWrite = Buffer.concat(stringBuffer);
            stringBuffer.length = 0;
            if (readable.push(toWrite) === false) {
              return;
            }
          }
          readable.push(null);
          break;
        }
        let item = queue.shift();
        if (Array.isArray(item)) {
          queue = item.concat(queue);
        } else if (typeof item === 'object' && item.then || item.pipe) {
          if (stringBuffer.length) {
            queue.unshift(item);
            let toWrite = Buffer.concat(stringBuffer);
            stringBuffer.length = 0;
            if (readable.push(toWrite) !== false) {
              read();
            }
            return;
          }
          if (item.pipe) {
            currentStream = new PassThrough();
            currentStreamHasData = false;
            item.pipe(currentStream);
            currentStream.once('end', () => {
              currentStream = null;
              if (wantsData) {
                read();
              }
            })
            currentStream.on('readable', () => {
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
            item
              .then(
                result => {
                  awaitingPromise = false;
                  queue.unshift(result);
                  read();
                },
                err => {
                  readable.emit('error', err);
                }
              );
          }
          // Exit out of this loop (we'll have called read again if needed)
          return;
        } else if (Buffer.isBuffer(item)) {
          stringBuffer.push(item);
        } else {
          // Combine plain strings together to avoid extra chunks
          stringBuffer.push(new Buffer('' + item, encoding));
        } 
      }
    }

    queue.push(strings[0]);
    for (let i = 0; i < iterpolations.length; i++) {
      queue.push(iterpolations[i]);
      queue.push(strings[i+1]);
    }

    var readable = new Readable({read});
    return readable;
  };
}

module.exports = makeForEncoding('utf8');
module.exports.encoding = makeForEncoding;
