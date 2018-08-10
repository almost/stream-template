# stream-template

An ES6/ES2015 [Tagged String
Literal](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals)
tag that can interpolate Node.JS streams, strings and Promises that return
either (or arrays of any of those) and produces a Node.JS stream. This allows
you to join several Streams together with bits in between without having to
buffer anything.

Written by Thomas Parslow ([almostobsolete.net](http://almostobsolete.net) and
[tomparslow.co.uk](http://tomparslow.co.uk)) for IORad
([iorad.com](http://iorad.com/)) and released with their kind permission.

[![NPM](https://nodei.co/npm/stream-template.png?downloads&downloadRank)](https://nodei.co/npm/stream-template/)

[![Build Status](https://travis-ci.org/almost/stream-template.svg)](https://travis-ci.org/almost/stream-template)

Warning: will only run on newer versions of Node.JS (tested on 4.0.0 and above)

## Install

```bash
npm install --save stream-template
```

## Examples

```javascript
const ST = require("stream-template");

const data1 = fs.createReadStream("data1.txt");
const data2 = fs.createReadStream("data2.txt");
const output = ST`<html>
  1: <pre>${data1}</pre>
  2: <pre>${data2}</pre>
</html>`;
output.pipe(process.stdout);
```

Can also accept arrays (items are concatenated, array items can be any of the
supported types):

```javascript
const ST = require("stream-template");

const data = [
  fs.createReadStream("part1.txt"),
  fs.createReadStream("part2.txt")
];
const output = ST`Data follows: ${data}`;
output.pipe(process.stdout);
```

And also Promises:

```javascript
const ST = require("./stream-template");
const fetch = require("node-fetch");

const email = fetch("https://api.github.com/users/almost")
  .then(r => r.json())
  .then(profile => {
    return profile.email;
  });

const output = ST`<a href="mailto:${email}">Email</a>`;
output.pipe(process.stdout);
```

And of course regular strings work:

```javascript
const output = ST`Hello by name is ${name}`;
output.pipe(process.stdout);
```

I've shown each used seperated but you can do it all mixed together as well.

## Encoding

By default strings are encoded as utf-8, you can change the encoding like this:

```javascript
const ST = require("stream-template").encoding("utf16le");
```

Note that buffers and other streams are passed through as-is, the encoding only
effects the template strings and interpolated strings.

## Contributing

Fixed or improved stuff? Great! Send me a pull request [through GitHub](http://github.com/almost/stream-template)
or get in touch on Twitter [@almostobsolete](https://twitter.com/almostobsolete) or email at tom@almostobsolete.net
