var peg = require('../build/regex-peg');

module.exports = {
  "exports": {
    "parse": function(test) {
      test.notEqual(peg.parse, null);
      test.ok('function' === typeof peg.parse);
      test.done();
    }
  },

  "simple": {
    "/abcd/": function(test) {
      var tree = peg.parse("abcd");
      test.deepEqual(tree, {
        type: "concat",
        value: [
          { type: "literal", value: "a" },
          { type: "concat", value: [
            { type: "literal", value: "b" },
            { type: "concat", value: [
              { type: "literal", value: "c" },
              { type: "literal", value: "d" }
            ] }
          ] }
        ]
      });
      test.done();
    },

    "/ab|cd/": function(test) {
      var tree = peg.parse("ab|cd");
      test.deepEqual(tree, {
        type: "union",
        value: [
          { type: "concat", value: [
            { type: "literal", value: "a" },
            { type: "literal", value: "b" }
          ] },
          { type: "concat", value: [
            { type: "literal", value: "c" },
            { type: "literal", value: "d" }
          ] }
        ]
      });
      test.done();
    },

    "/ab?cd/": function(test) {
      var tree = peg.parse("ab?cd");
      test.deepEqual(tree, {
        type: "concat",
        value: [
          { type: "literal", value: "a" },
          { type: "concat", value: [
            { type: "repetition", quantifier: "?", value:
              { type: "literal", value: "b" }
            },
            { type: "concat", value: [
              { type: "literal", value: "c" },
              { type: "literal", value: "d" }
            ] }
          ] }
        ]
      });
      test.done();
    },

    "/abc+d/": function(test) {
      var tree = peg.parse("abc+d");
      test.deepEqual(tree, {
        type: "concat",
        value: [
          { type: "literal", value: "a" },
          { type: "concat", value: [
            { type: "literal", value: "b" },
            { type: "concat", value: [
              { type: "repetition", quantifier: "+", value:
                { type: "literal", value: "c" }
              },
              { type: "literal", value: "d" }
            ] }
          ] }
        ]
      });
      test.done();
    },

    "/a(bc)*d/": function(test) {
      var tree = peg.parse("a(bc)*d");
      test.deepEqual(tree, {
        type: "concat",
        value: [
          { type: "literal", value: "a" },
          { type: "concat", value: [
            { type: "repetition", quantifier: "*", value:
              { type: "concat", value: [
                { type: "literal", value: "b" },
                { type: "literal", value: "c" }
              ] }
            },
            { type: "literal", value: "d" }
          ] }
        ]
      });
      test.done();
    },

    "/a[bc]d/": function(test) {
      var tree = peg.parse("a[bc]d");
      test.deepEqual(tree, {
        type: "concat",
        value: [
          { type: "literal", value: "a" },
          { type: "concat", value: [
            { type: "char_class", value: "bc" },
            { type: "literal", value: "d" }
          ] }
        ]
      });
      test.done();
    },

    "/a.*d/": function(test) {
      var tree = peg.parse("a.*d");
      test.deepEqual(tree, {
        type: "concat",
        value: [
          { type: "literal", value: "a" },
          { type: "concat", value: [
            { type: "repetition", quantifier: "*", value:
              { type: "wildcard" }
            },
            { type: "literal", value: "d" }
          ] }
        ]
      });
      test.done();
    },

    "/[aA]bc[dD]/": function(test) {
      var tree = peg.parse("[aA]bc[dD]");
      test.deepEqual(tree, {
        type: "concat",
        value: [
          { type: "char_class", value: "aA" },
          { type: "concat", value: [
            { type: "literal", value: "b" },
            { type: "concat",
              value: [
                { type: "literal", value: "c" },
                { type: "char_class", value: "dD" }
            ] }
          ] }
        ]
      });
      test.done();
    }
  }
};
