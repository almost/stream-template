'use strict';
var ST = require('./stream-template');
var expect = require('expect.js');
var concat = require('concat-stream');
var stream = require('readable-stream');

function makeStream() {
  return new stream.Readable({
    read: function () {},
  });
}

describe('stream-template', function () {
  it('should produce a stream as output', function (done) {
    var out = ST`Hello world`;
    out.pipe(concat(function (output) {
      expect(Buffer.isBuffer(output)).equal(true);
      expect(output.toString()).equal('Hello world');
      done();
    }));
  });

  it('should interpolate normal strings ', function (done) {
    var name = 'tom';
    var test = 'string';
    var out = ST`Hello ${name}, welcome to the ${test} test`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal('Hello tom, welcome to the string test');
      done();
    }));
  });

  it('should interpolate buffers ', function (done) {
    var name = new Buffer('tom', 'utf8')
    var test = new Buffer('buffer', 'utf8');
    var out = ST`Hello ${name}, welcome to the ${test} test`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal('Hello tom, welcome to the buffer test');
      done();
    }));
  });

  it('should interpolate streams', function (done) {
    var stream1 = makeStream();
    var stream2 = makeStream();
    var out = ST`First ${stream1} then ${stream2}!`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal('First bread and cheese then wine and more cheese!');
      done();
    }));

    stream2.push('wine', 'utf8');
    stream1.push('bread', 'utf8');
    stream2.push(' and more cheese', 'utf8');
    stream2.push(null);
    stream1.push(' and cheese', 'utf8');
    stream1.push(null);
  });

  it('should wait for all data from a stream ', function (done) {
    var stream1 = makeStream();
    stream1.push('a', 'utf8');
    var out = ST`${stream1}`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal('abcd');
      done();
    }));

    stream1.push('b', 'utf8');
    setImmediate(function () {
      stream1.push('c', 'utf8');
      setTimeout(function () {
        stream1.push('d', 'utf8');
        stream1.push(null);
      }, 20)
    });
  });

  it('should intepolate promises returning strings', function (done) {
    var promise = Promise.resolve("hello");
    var out = ST`${promise} world`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal('hello world');
      done();
    }));
  });

  it('should interpolate promises returning streams', function (done) {
    var stream1 = makeStream();
    var promise = Promise.resolve(stream1);
    var out = ST`${promise} world`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal('hello world');
      done();
    }));
    stream1.push('hello');
    stream1.push(null);
  });

  it('should interpolate arrays', function (done) {
    var stream1 = makeStream();
    var stream2 = makeStream();
    stream1.push('there ');
    stream2.push('world');
    stream1.push(null);
    stream2.push(null);
    var array = ['hello ', Promise.resolve(stream1), stream2, [", how's ", "it ", "going"]];

    var out = ST`Well ${array}?`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal("Well hello there world, how's it going?");
      done();
    }));
  });

  it('should concatenate multiple strings together and emit as a single chunk', function (done) {
    var promise = Promise.resolve('d');
    var out = ST`a ${'b'} c ${promise} e ${['f', ' g']}`;
    let chunks = [];
    out.on('data', chunk => chunks.push(chunk.toString()));
    out.on('end', () => {
      expect(chunks).eql(['a b c ', 'd e f g']);
      done();
    });
  });

  it('should allow different encodings to be specified', function (done) {
    var name = new Buffer('tom', 'utf16le')
    var test = "encoding";
    var out = ST.encoding('utf16le')`Hello ${name}, welcome to the ${test} test`;
    out.pipe(concat(function (output) {
      expect(output.toString('utf16le')).equal('Hello tom, welcome to the encoding test');
      done();
    }));
  });

  it('should forward stream errors', function (done) {
    var s = makeStream();
    var out = ST`${s}`;

    out.on('error', function (err) {
      expect(err.message).equal('destroyed');
      done();
    });

    s.destroy(new Error('destroyed'));
  });

  it('should destroy source streams on error', function (done) {
    var destroyed = false;
    var s = stream.Readable({
      read: function () {},
      destroy: function () {
        destroyed = true;
        s.emit('close');
      }
    });

    var out = ST`${s}`;

    s.on('close', function () {
      expect(destroyed).equal(true);
      done();
    });

    out.destroy();
  });

  it('should handle undefined interpolations', function (done) {
    var name = 'tom';
    var test = undefined;
    var out = ST`Hello ${name}, welcome to the ${test} test`;
    out.pipe(concat(function (output) {
      expect(output.toString()).equal('Hello tom, welcome to the  test');
      done();
    }));
  })
});
