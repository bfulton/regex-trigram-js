/**
 * regex-trigram - a port of RegexpQuery and related functions:
 *   https://code.google.com/p/codesearch/source/browse/index/regexp.go
 *
 * Portions of this library are based on Code Search, which is available under
 * the New BSD License and copyright by The Go Authors. Code Search can be found
 * at https://code.google.com/p/codesearch/ with background and usage details
 * provided by Russ Cox at http://swtch.com/~rsc/regexp/regexp4.html.
 *
 * To use:
 *
 *    var regex = require('regex-trigram');
 *    var re = regex.parse("abc?d|wxyz+");
 *    cosonle.log(re);
 *    var q = regex.query(re);
 *    cosonle.log(q);
 */

var peg = require('../regex-peg');
var query = require('./regex-query');

module.exports = {
  /**
   * Generate a regex parse tree for a given RegExp source using a simplified
   * subset regular expression grammar.
   *
   * @param {String} regexp source to get the parse tree for
   * @return regex parse tree
   * @throws {SyntaxError} when the RegExp source isn't supported
   */
  parse: function(regexp) {
    return peg.parse(regexp);
  },

  /**
   * Generate query for a parsed regex.
   *
   * @param re regex parse tree
   * @return
   */
  query: function(re) {
    return query.query(re);
  }
};