var CombinedStream = require('combined-stream2');
var stream = require('stream');
var PassThrough = stream.PassThrough;
var Readable = stream.Readable;

function string2stream(string) {
  var s = new Readable();
  s.push(string, 'utf8');
  s.push(null);
  return s;
}

function outputItem(output, item) {
  if (Array.isArray(item)) {
    for(var i = 0; i < item.length; i++) {
      outputItem(output, item[i]);
    }
  } else if (typeof item === 'object' && (item.pipe || item.then)) {
    if (item.pipe) {
      // Stream
      output.append(item);
    } else {
      // Promise
      const stream = new PassThrough();
      item.then(result => {
        const output = CombinedStream.create();
        outputItem(output, result);
        output.pipe(stream);
      })
      .catch(error => {
        stream.emit('error', error);
        stream.close();
      });
      output.append(stream);
    }
  } else {
    output.append(string2stream('' + item));
  }
}

// Use template literals to allow a template where the variables are streams,
// the output as a whole is also a stream.
module.exports = function StreamTemplate(strings, ...iterpolations) {
  const output = CombinedStream.create();
  output.append(string2stream(strings[0]));
  for (let i = 0; i < iterpolations.length; i++) {
    outputItem(output, iterpolations[i]);
    output.append(string2stream(strings[i+1]));
  }
  return output;
}
