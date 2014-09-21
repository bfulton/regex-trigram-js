var regex = require('../src/regex-trigram');

module.exports = {
  "exports": {
    "parse": function(test) {
      test.notEqual(regex.parse, null);
      test.ok('function' === typeof regex.parse);
      test.done();
    },

    "query": function(test) {
      test.notEqual(regex.query, null);
      test.ok('function' === typeof regex.query);
      test.done();
    }
  },

  "simple": {
    "/abcd/": function(test) {
      var re = regex.parse("abcd");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'AND',
        trigram: ["abc", "bcd"],
        sub: []
      });
      test.done();
    },

    "/ab|cd/": function(test) {
      var re = regex.parse("ab|cd");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'ALL',
        trigram: [],
        sub: []
      });
      test.done();
    },

    "/ab?cd/": function(test) {
      var re = regex.parse("ab?cd");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'AND',
        trigram: [],
        sub: [
          { op: 'OR',
            trigram: [],
            sub: [
              { op: 'AND',
                trigram: [ 'abc', 'bcd' ],
                sub: []
              },
              { op: 'AND',
                trigram: [ 'acd' ],
                sub: []
              }
            ]
          }
        ]
      });
      test.done();
    },

    "/abc+d/": function(test) {
      var re = regex.parse("abc+d");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'AND',
        trigram: [ 'abc' ],
        sub: []
      });
      test.done();
    },

    "/a(bc)*d/": function(test) {
      var re = regex.parse("a(bc)*d");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'AND',
        trigram: [],
        sub: []
      });
      test.done();
    },

    "/a[bc]d/": function(test) {
      var re = regex.parse("a[bc]d");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'OR',
        trigram: ['abd', 'acd'],
        sub: []
      });
      test.done();
    },

    "/a.*d/": function(test) {
      var re = regex.parse("a.*d");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'AND',
        trigram: [],
        sub: []
      });
      test.done();
    },

    "/[aA]bc[dD]/": function(test) {
      var re = regex.parse("[aA]bc[dD]");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'OR',
        trigram: [],
        sub:
          [
            { op: 'AND',
              trigram: [ 'Abc' ],
              sub: [
                { op: 'OR',
                  trigram: [ 'bcD', 'bcd' ],
                  sub: []
                }
              ]
            },
            { op: 'AND',
              trigram: [ 'abc', 'bcD' ],
              sub: []
            },
            { op: 'AND',
              trigram: [ 'abc', 'bcd' ],
              sub: []
            }
          ]
      });
      test.done();
    }
  }
};
