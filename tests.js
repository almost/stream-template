var ST = require('./stream-template');
var expect = require('expect.js');
var concat = require('concat-stream');
var stream = require('stream');

function makeStream() {
  return new stream.Readable({
    read: function () {},
  });
}

describe('stream-template', function () {
  it('should produce a stream as output', function (done) {
    var out = ST`Hello world`;
    out.pipe(concat(function (output) {
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

  xit('should pass on errors from interpolated streams', function (done) {
    var stream1 = makeStream();
    var out = ST`Oh no ${stream1}!`;
    stream1.push('error in 3... 2...');
    out.on('error', function (error) {
      expect(error.message).equal('boom');
      done();
    });

    stream1.emit('error', new Error('boom'));
  });

  xit('should pass on errors from interpolated promises', function (done) {
    var promise = Promise.reject(new Error("boom"));
    var out = ST`Oh no ${promise}!`;
    out.on('error', function (error) {
      expect(error.message).equal('boom');
      done();
    });
  });

  // it('should pass back backpreasure signals', function () {
    
  // });

  // it('should treat strings as utf8 by default', function () {
    
  // });

  // it('should allow string encoding to be set', function () {
    
  // });

  // it('should treat buffers as containing utf8 strings', function () {
    
  // });
});
