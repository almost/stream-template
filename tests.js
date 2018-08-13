"use strict";

const ST = require("./stream-template");
const expect = require("expect.js");
const concat = require("concat-stream");
const stream = require("readable-stream");

function makeStream() {
  return new stream.Readable({
    read: function() {}
  });
}

describe("stream-template", function() {
  it("should produce a stream as output", function(done) {
    const out = ST`Hello world`;
    out.pipe(
      concat(function(output) {
        expect(Buffer.isBuffer(output)).equal(true);
        expect(output.toString()).equal("Hello world");
        done();
      })
    );
  });

  it("should interpolate normal strings ", function(done) {
    const name = "tom";
    const test = "string";
    const out = ST`Hello ${name}, welcome to the ${test} test`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal(
          "Hello tom, welcome to the string test"
        );
        done();
      })
    );
  });

  it("should interpolate buffers ", function(done) {
    const name = new Buffer("tom", "utf8");
    const test = new Buffer("buffer", "utf8");
    const out = ST`Hello ${name}, welcome to the ${test} test`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal(
          "Hello tom, welcome to the buffer test"
        );
        done();
      })
    );
  });

  it("should interpolate streams", function(done) {
    const stream1 = makeStream();
    const stream2 = makeStream();
    const out = ST`First ${stream1} then ${stream2}!`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal(
          "First bread and cheese then wine and more cheese!"
        );
        done();
      })
    );

    stream2.push("wine", "utf8");
    stream1.push("bread", "utf8");
    stream2.push(" and more cheese", "utf8");
    stream2.push(null);
    stream1.push(" and cheese", "utf8");
    stream1.push(null);
  });

  it("should wait for all data from a stream ", function(done) {
    const stream1 = makeStream();
    stream1.push("a", "utf8");
    const out = ST`${stream1}`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal("abcd");
        done();
      })
    );

    stream1.push("b", "utf8");
    setImmediate(function() {
      stream1.push("c", "utf8");
      setTimeout(function() {
        stream1.push("d", "utf8");
        stream1.push(null);
      }, 20);
    });
  });

  it("should intepolate promises returning strings", function(done) {
    const promise = Promise.resolve("hello");
    const out = ST`${promise} world`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal("hello world");
        done();
      })
    );
  });

  it("should interpolate promises returning streams", function(done) {
    const stream1 = makeStream();
    const promise = Promise.resolve(stream1);
    const out = ST`${promise} world`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal("hello world");
        done();
      })
    );
    stream1.push("hello");
    stream1.push(null);
  });

  it("should interpolate arrays", function(done) {
    const stream1 = makeStream();
    const stream2 = makeStream();
    stream1.push("there ");
    stream2.push("world");
    stream1.push(null);
    stream2.push(null);
    const array = [
      "hello ",
      Promise.resolve(stream1),
      stream2,
      [", how's ", "it ", "going"]
    ];

    const out = ST`Well ${array}?`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal(
          "Well hello there world, how's it going?"
        );
        done();
      })
    );
  });

  it("should concatenate multiple strings together and emit as a single chunk", function(done) {
    const promise = Promise.resolve("d");
    const out = ST`a ${"b"} c ${promise} e ${["f", " g"]}`;
    let chunks = [];
    out.on("data", chunk => chunks.push(chunk.toString()));
    out.on("end", () => {
      expect(chunks).eql(["a b c ", "d e f g"]);
      done();
    });
  });

  it("should allow different encodings to be specified", function(done) {
    const name = new Buffer("tom", "utf16le");
    const test = "encoding";
    const out = ST.encoding(
      "utf16le"
    )`Hello ${name}, welcome to the ${test} test`;
    out.pipe(
      concat(function(output) {
        expect(output.toString("utf16le")).equal(
          "Hello tom, welcome to the encoding test"
        );
        done();
      })
    );
  });

  it("should forward stream errors", function(done) {
    const s = makeStream();
    const out = ST`${s}`;

    out.on("error", function(err) {
      expect(err.message).equal("destroyed");
      done();
    });

    s.destroy(new Error("destroyed"));
  });

  it("should destroy source streams on error", function(done) {
    let destroyed = false;
    const s = stream.Readable({
      read: function() {},
      destroy: function() {
        destroyed = true;
        s.emit("close");
      }
    });

    const out = ST`${s}`;

    out.on("error", function() {
      expect(destroyed).equal(true);
      done();
    });

    out.destroy();
  });

  it("should destroy source streams on Promise error", function(done) {
    const promise = Promise.reject(Error("destroyed"));
    const out = ST`${promise} world`;

    out.on("error", function(err) {
      expect(err.message).equal("destroyed");
      done();
    });
  });

  it("should handle undefined interpolations", function(done) {
    const name = "tom";
    const test = undefined;
    const out = ST`Hello ${name}, welcome to the ${test} test`;
    out.pipe(
      concat(function(output) {
        expect(output.toString()).equal("Hello tom, welcome to the  test");
        done();
      })
    );
  });
});
