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
    },

    "/([0-9]+) ?sec/": function(test) {
      var re = regex.parse("([0-9]+) ?sec");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'AND',
        trigram: [ 'sec' ],
        sub:
          [
            { op: 'OR',
              trigram: [ '1se', '2se', '3se', '4se', '5se', '6se', '7se', '8se', '9se' ],
              sub: [
                { op: 'AND',
                  trigram: [ ' se' ],
                  sub: [
                    { op: 'OR',
                      trigram: [ '0 s', '1 s', '2 s', '3 s', '4 s', '5 s', '6 s', '7 s', '8 s', '9 s' ],
                      sub: []
                    }
                  ]
                },
                { op: 'AND',
                  trigram: [ '0se' ],
                  sub: []
                }
              ]
            }
          ]
      });
      test.done();
    },

    "/Mon|Tue|Wed|Thu|Fri|Sat|Sun|Oct|event|2014| 14/": function(test) {
      var re = regex.parse("Mon|Tue|Wed|Thu|Fri|Sat|Sun|Oct|event|2014| 14");
      var q = regex.query(re);
      test.deepEqual(q, {
        op: 'AND',
        trigram: [],
        sub:
          [
            { op: 'OR',
              trigram: [ 'Fri', 'Mon', 'Oct', 'Sat', 'Sun', 'Thu', 'Tue', 'Wed' ],
              sub: [
                { op: 'AND',
                  trigram: [ '014', '201' ],
                  sub: []
                },
                { op: 'AND', trigram: [ ' 14' ], sub: [] },
                { op: 'AND',
                  trigram: [ 'ent', 'eve', 'ven' ],
                  sub: []
                }
              ]
            }
          ]
      });
      test.done();
    }
  }
};
