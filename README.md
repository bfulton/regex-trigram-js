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
