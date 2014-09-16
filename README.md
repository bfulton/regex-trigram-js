[![Build Status](https://travis-ci.org/bfulton/regex-trigram-js.svg)](https://travis-ci.org/bfulton/regex-trigram-js)
[![NPM version](https://badge.fury.io/js/regex-trigram.svg)](http://badge.fury.io/js/regex-trigram)

regex-trigram-js
================

This project ports some ideas [Russ Cox](http://swtch.com/~rsc/) shared on
[how Google Code Search works](http://swtch.com/~rsc/regexp/regexp4.html) — in
particular the [`RegexpQuery` and related functions](https://code.google.com/p/codesearch/source/browse/index/regexp.go) —
from Go to JavaScript. Since JavaScript doesn't have an equivalent to Go's [`regexp/syntax`](http://golang.org/pkg/regexp/syntax/),
we also use [PEG.js](http://pegjs.majda.cz/) to introduce a simplified regular
expression grammar to obtain parse trees for a subset of valid [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
patterns. The goal of this work is to enable JS clients an effective way to
query Trigram indexes for candidate documents.

Usage
-----

Include the library.

```javascript
var regex = require('regex-trigram');
```

Parse a regular expression.

```javascript
var re = regex.parse("a[bc]d");
console.log(JSON.stringify(re, null, 2));
```

Which should look like:

```json
{
  "type": "concat",
  "value": [
    {
      "type": "literal",
      "value": "a"
    },
    {
      "type": "concat",
      "value": [
        {
          "type": "char_class",
          "value": "bc"
        },
        {
          "type": "literal",
          "value": "d"
        }
      ]
    }
  ]
}
```

Convert the parsed regular expression into a trigram query.

```javascript
var q = regex.query(re);
console.log(JSON.stringify(q, null, 2));
```

Which should look like:

```json
{
  "op": "OR",
  "trigram": [
    "abd",
    "acd"
  ],
  "sub": []
}
```
