/**
 * Regular expression query for a trigram index
 *
 * Ported to JavaScript from Russ Cox's description of how Google Code Search
 * worked, and the corresponding Go code.
 *
 *   http://swtch.com/~rsc/regexp/regexp4.html
 *   https://code.google.com/p/codesearch/source/browse/index/regexp.go
 */

module.exports = {
  query: function(re) {
    var info = analyze(re);
    info.simplify(true);
    info.addExact();
    return info.match;
  }
};

// analyze returns the regexpInfo for the regexp re.
var analyze = function(re) {
  //println("analyze", re.String())
  //defer func() { println("->", ret.String()) }()
  var info = new RegexInfo({});
  switch (re.type) {
    case "NO_MATCH":
      return RegexInfo.noMatch();

    case "EMPTY_MATCH":
    case "BEGIN_LINE":
    case "END_LINE":
    case "BEGIN_TEXT":
    case "END_TEXT":
    case "WORD_BOUNDARY":
    case "NO_WORD_BOUNDARY":
      return RegexInfo.emptyString();

    case "literal":
      /*
       if (re.Flags&syntax.FoldCase != 0 {
       switch len(re.Rune) {
       case 0:
       return emptyString()
       case 1:
       // Single-letter case-folded string:
       // rewrite into char class and analyze.
       re1 := &syntax.Regexp{
       Op: syntax.OpCharClass,
       }
       re1.Rune = re1.Rune0[:0]
       r0 := re.Rune[0]
       re1.Rune = append(re1.Rune, r0, r0)
       for r1 := unicode.SimpleFold(r0); r1 != r0; r1 = unicode.SimpleFold(r1) {
       re1.Rune = append(re1.Rune, r1, r1)
       }
       info = analyze(re1)
       return info
       }
       // Multi-letter case-folded string:
       // treat as concatenation of single-letter case-folded strings.
       re1 := &syntax.Regexp{
       Op:    syntax.OpLiteral,
       Flags: syntax.FoldCase,
       }
       info = emptyString()
       for i := range re.Rune {
       re1.Rune = re.Rune[i : i+1]
       info = concat(info, analyze(re1))
       }
       return info
       }
       */
      info.exact = [ re.value ];
      info.match = RegexQuery.ALL;
      break;

    case "ANY_CHAR_NOT_NL":
    case "ANY_CHAR":
      return RegexInfo.anyChar();

    case "CAPTURE":
      return analyze(re.value[0]);

    case "concat":
      return fold(concat, re.value, RegexInfo.emptyString());

    case "union":
      return fold(alternate, re.value, RegexInfo.noMatch());

    case "repetition":
      if (re.quantifier == "?") {
        return alternate(analyze(re.value), RegexInfo.emptyString());
      } else if (re.quantifier == "+") {
        // x+
        // Since there has to be at least one x, the prefixes and suffixes
        // stay the same.  If x was exact, it isn't anymore.
        info = analyze(re.value);
        if (info.exact.length) {
          info.prefix = info.exact;
          info.suffix = info.exact.slice();
          info.exact = [];
        }
      } else if (re.quantifier == "*") {
        // We don't know anything, so assume the worst.
        return RegexInfo.anyMatch();
      } else {
        throw new Error("unhandled repetition quantifier: " + re.quantifier);
      }
      break;

    case "REPEAT":
      if (re.min === 0) {
        // Like STAR
        return RegexInfo.anyMatch();
      }
      /* falls through */
    case "char_class":
      info.match = RegexQuery.ALL;

      var classExpansion = expandCharClass(re.value);

      // Special case.
      if (classExpansion.length === 0) {
        return RegexInfo.noMatch();
      }

      // If the class is too large, it's okay to overestimate.
      if (classExpansion.length > 100) {
        return RegexInfo.anyChar();
      }

      info.exact = classExpansion;
      break;

    default:
      throw new Error("unhandled expression type: " + re.type);
  }
  info.simplify(false);
  return info;
};

var expandCharClass = function(charClass) {
  var pattern = new RegExp("[" + charClass + "]");
  var expansion = [];
  for (var code = 0; code < 0xFFFF; code++) {
    var char = String.fromCharCode(code);
    if (expansion.indexOf(char) != -1) {
      continue;
    }
    if (pattern.test(char)) {
      expansion.push(char);
    }
  }
  return expansion;
};

// fold is the usual higher-order function.
var fold = function(f, sub, zero) {
  var info;
  if (sub.length === 0) {
    info = zero;
  } else if (sub.length == 1) {
    info = analyze(sub[0]);
  } else {
    var analyzeSub0 = analyze(sub[0]);
    var analyzeSub1 = analyze(sub[1]);
    info = f(analyzeSub0, analyzeSub1);
    for (var i = 2; i < sub.length; i++) {
      info = f(info, analyze(sub[i]));
    }
  }
  return info;
};

// concat returns the regexp info for xy given x and y.
var concat = function(x, y) {
  //println("concat", x.String(), "...", y.String())
  //defer func() { println("->", out.String()) }()
  var xy = new RegexInfo({});
  xy.match = x.match.and(y.match);
  if (x.exact.length && y.exact.length) {
    xy.exact = cross(x.exact, y.exact, false);
  } else {
    if (x.exact.length) {
      xy.prefix = cross(x.exact, y.prefix, false);
    } else {
      xy.prefix = x.prefix;
      if (x.canEmpty) {
        xy.prefix = union(xy.prefix, y.prefix, false);
      }
    }
    if (y.exact.length) {
      xy.suffix = cross(x.suffix, y.exact, true);
    } else {
      xy.suffix = y.suffix;
      if (y.canEmpty) {
        xy.suffix = union(xy.suffix, x.suffix, true);
      }
    }
  }

  // If all the possible strings in the cross product of x.suffix
  // and y.prefix are long enough, then the trigram for one
  // of them must be present and would not necessarily be
  // accounted for in xy.prefix or xy.suffix yet.  Cut things off
  // at maxSet just to keep the sets manageable.
  if (!x.exact.length && !y.exact.length &&
    x.suffix.length <= maxSet && y.prefix.length <= maxSet &&
    minLen(x.suffix) + minLen(y.prefix) >= 3) {
    xy.match = xy.match.andTrigrams(cross(x.suffix, y.prefix, false));
  }

  xy.simplify(false);
  return xy;
};

// alternate returns the regexpInfo for x|y given x and y.
var alternate = function(x, y) {
  //println("alternate", x.String(), "...", y.String())
  //defer func() { println("->", out.String()) }()
  var xy = new RegexInfo({});
  if (x.exact.length && y.exact.length) {
    xy.exact = union(x.exact, y.exact, false);
  } else if (x.exact.length) {
    xy.prefix = union(x.exact, y.prefix, false);
    xy.suffix = union(x.exact, y.suffix, true);
    x.addExact();
  } else if (y.exact.length) {
    xy.prefix = union(x.prefix, y.exact, false);
    xy.suffix = union(x.suffix, y.exact.copy(), true);
    y.addExact();
  } else {
    xy.prefix = union(x.prefix, y.prefix, false);
    xy.suffix = x.suffix.union(y.suffix, true);
  }
  xy.canEmpty = x.canEmpty || y.canEmpty;
  xy.match = x.match.or(y.match);

  xy.simplify(false);
  return xy;
};

/**
 * RegexQuery
 * @constructor
 */
function RegexQuery(op, trigram, sub) {
  this.op = op;
  this.trigram = trigram ? trigram : [];
  this.sub = sub ? sub : [];
}

RegexQuery.ALL = new RegexQuery("ALL");

RegexQuery.NONE = new RegexQuery("NONE");

/**
 * Returns the query: this AND other.
 * @param {RegexQuery} other the other query to AND with this
 * @return {RegexQuery} the query: this AND other
 */
RegexQuery.prototype.and = function(other) {
  return this.andOr(other, "AND");
};

/**
 * Returns the query: this OR other.
 * @param {RegexQuery} other the other query to OR with this
 * @return {RegexQuery} the query: this OR other
 */
RegexQuery.prototype.or = function(other) {
  return this.andOr(other, "OR");
};


/**
 * Returns the query: this AND other - or - this OR other
 * @param {RegexQuery} other the other query to OR with this
 * @param {String} op query op: either "AND" or "OR"
 * @return {RegexQuery} the query: this OR other
 */
RegexQuery.prototype.andOr = function(other, op) {
  var r = other;
  var q = this;
  if (q.trigram.length === 0 && q.sub.length == 1) {
    q = q.sub[0];
  }
  if (r.trigram.length === 0 && r.sub.length == 1) {
    r = r.sub[0];
  }

  // Boolean simplification.
  // If q ⇒ r, q AND r ≡ q.
  // If q ⇒ r, q OR r ≡ r.
  if (q.implies(r)) {
    //println(q.String(), "implies", r.String())
    if (op == "AND") {
      return q;
    }
    return r;
  }
  if (r.implies(q)) {
    //println(r.String(), "implies", q.String())
    if (op == "AND") {
      return r;
    }
    return q;
  }

  // Both q and r are AND or OR.
  // If they match or can be made to match, merge.
  var qAtom = q.trigram.length == 1 && q.sub.length === 0;
  var rAtom = r.trigram.length == 1 && r.sub.length === 0;
  if (q.op == op && (r.op == op || rAtom)) {
    q.trigram = union(q.trigram, r.trigram, false);
    q.sub = q.sub.concat(r.sub);
    return q;
  }
  if (r.op == op && qAtom) {
    r.trigram = union(r.trigram, q.trigram, false);
    return r;
  }
  if (qAtom && rAtom) {
    q.op = op;
    q.trigram = q.trigram.concat(r.trigram);
    return q;
  }

  // If one matches the op, add the other to it.
  if (q.op == op) {
    q.sub = q.sub.concat(r);
    return q;
  }
  if (r.op == op) {
    r.sub = r.sub.concat(q);
    return r;
  }

  // We are creating an AND of ORs or an OR of ANDs.
  // Factor out common trigrams, if any.
  var common = [];
  var i = 0, j = 0;
  var wi = 0, wj = 0;
  while (i < q.trigram.length && j < r.trigram.length) {
    var qt = q.trigram[i], rt = r.trigram[j];
    if (qt < rt) {
      q.trigram[wi] = qt;
      wi++;
      i++;
    } else if (qt > rt) {
      r.trigram[wj] = rt;
      wj++;
      j++;
    } else {
      common = common.concat(qt);
      i++;
      j++;
    }
  }
  for (; i < q.trigram.length; i++) {
    q.trigram[wi] = q.trigram[i];
    wi++;
  }
  for (; j < r.trigram.length; j++) {
    r.trigram[wj] = r.trigram[j];
    wj++;
  }
  q.trigram = q.trigram.slice(0, wi);
  r.trigram = r.trigram.slice(0, wj);
  if (common.length > 0) {
    // If there were common trigrams, rewrite
    //
    //      (abc|def|ghi|jkl) AND (abc|def|mno|prs) =>
    //              (abc|def) OR ((ghi|jkl) AND (mno|prs))
    //
    //      (abc&def&ghi&jkl) OR (abc&def&mno&prs) =>
    //              (abc&def) AND ((ghi&jkl) OR (mno&prs))
    //
    // Build up the right one of
    //      (ghi|jkl) AND (mno|prs)
    //      (ghi&jkl) OR (mno&prs)
    // Call andOr recursively in case q and r can now be simplified
    // (we removed some trigrams).
    var s = q.andOr(r, op);

    // Add in factored trigrams.
    var otherOp = op == "AND" ? "OR" : "AND";
    var t = new RegexQuery(otherOp, common);
    return t.andOr(s, t.op);
  }

  // Otherwise just create the op.
  return new RegexQuery(op, [], [q, r]);
};

// implies reports whether q implies r.
// It is okay for it to return false negatives.
RegexQuery.prototype.implies = function(r) {
  var q = this;
  if (q.op == "NONE" || r.op == "ALL") {
    // False implies everything.
    // Everything implies True.
    return true;
  }
  if (q.op == "ALL" || r.op == "NONE") {
    // True implies nothing.
    // Nothing implies False.
    return false;
  }

  if (q.op == "AND" || (q.op == "OR" && q.trigram.length == 1 && q.sub.length === 0)) {
    return q.trigramImplies(r);
  }

  return q.op == "OR" && r.op == "OR" &&
    q.trigram.length > 0 && q.sub.length === 0 &&
    isSubsetOf(q.trigram, r.trigram);
};

/**
 * @param {RegexQuery} other
 * @return {boolean}
 */
RegexQuery.prototype.trigramImplies = function(other) {
  var t = this.trigram;
  var i;
  if (other.op == "OR") {
    for (i = 0; i < other.sub.length; i++) {
      if (this.trigramImplies(other.sub[i])) {
        return true;
      }
    }
    for (i = 0; i < t.length; i++) {
      if (isSubsetOf([t[i]], other.trigram)) {
        return true;
      }
    }
    return false;
  }
  if (other.op == "AND") {
    for (i = 0; i < other.sub.length; i++) {
      if (!this.trigramImplies(other.sub[i])) {
        return false;
      }
    }
    return isSubsetOf(other.trigram, t);
  }
  return false;
};

// andTrigrams returns q AND the OR of the AND of the trigrams present in each string.
RegexQuery.prototype.andTrigrams = function(t) {
  var q = this;
  if (minLen(t) < 3) {
    // If there is a short string, we can't guarantee
    // that any trigrams must be present, so use ALL.
    // q AND ALL = q.
    return q;
  }

  var or = RegexQuery.NONE;
  for (var j = 0; j < t.length; j++) {
    var tt = t[j];
    var trig = [];
    for (var i = 0; i + 3 <= tt.length; i++) {
      trig.push(tt.substring(i, i + 3));
    }
    trig = clean(trig, false);
    //println(tt, "trig", strings.Join(trig, ","))
    or = or.or(new RegexQuery("AND", trig));
  }
  q = q.and(or);
  return q;
};

RegexQuery.prototype.toString = function() {
  var q = this;
  if (q.op == "NONE") {
    return "-";
  }
  if (q.op == "ALL") {
    return "+";
  }

  if (q.sub.length === 0 && q.trigram.length == 1) {
    return q.trigram[0]; // TODO: quote it
  }

  var s, sjoin, end, tjoin;
  if (q.op == "AND") {
    s = "";
    sjoin = " ";
    end = "";
    tjoin = " ";
  } else {
    s = "(";
    sjoin = ")|(";
    end = ")";
    tjoin = "|";
  }
  for (var i = 0; i < q.trigram.length; i++) {
    var t = q.trigram[i];
    if (i > 0) {
      s += tjoin;
    }
    s += t; // TODO: quote it
  }
  if (q.sub.length > 0) {
    if (q.trigram.length > 0) {
      s += sjoin;
    }
    s += q.sub[0].toString();
    for (i = 1; i < q.sub.length; i++) {
      s += sjoin + q.sub[i].toString();
    }
  }
  s += end;
  return s;
};

/**
 * RegexInfo summarizes the results of analyzing a regexp.
 * @constructor
 * @param {Object} opts an options hash
 */
function RegexInfo(opts) {
  // canEmpty records whether the regexp matches the empty string
  this.canEmpty = opts.canEmpty ? opts.canEmpty : false;

  // exact is the exact set of strings matching the regexp.
  this.exact = opts.exact ? opts.exact : [];

  // if exact is nil, prefix is the set of possible match prefixes,
  // and suffix is the set of possible match suffixes.
  this.prefix = opts.prefix ? opts.prefix : []; // otherwise: the exact set of matching prefixes ...
  this.suffix = opts.suffix ? opts.suffix : []; // ... and suffixes

  // match records a query that must be satisfied by any
  // match for the regexp, in addition to the information
  // recorded above.
  this.match = opts.match ? opts.match : new RegexQuery();
}

// Exact sets are limited to maxExact strings.
// If they get too big, simplify will rewrite the regexpInfo
// to use prefix and suffix instead.  It's not worthwhile for
// this to be bigger than maxSet.
// Because we allow the maximum length of an exact string
// to grow to 5 below (see simplify), it helps to avoid ridiculous
// alternations if maxExact is sized so that 3 case-insensitive letters
// triggers a flush.
var maxExact = 7;

// Prefix and suffix sets are limited to maxSet strings.
// If they get too big, simplify will replace groups of strings
// sharing a common leading prefix (or trailing suffix) with
// that common prefix (or suffix).  It is useful for maxSet
// to be at least 2³ = 8 so that we can exactly
// represent a case-insensitive abc by the set
// {abc, abC, aBc, aBC, Abc, AbC, ABc, ABC}.
var maxSet = 20;

// anyMatch returns the regexpInfo describing a regexp that
// matches any string.
RegexInfo.anyMatch = function() {
  return new RegexInfo({
    canEmpty: true,
    prefix: [""],
    suffix: [""],
    match: RegexQuery.ALL
  });
};

// anyChar returns the regexpInfo describing a regexp that
// matches any single character.
RegexInfo.anyChar = function() {
  return new RegexInfo({
    prefix: [""],
    suffix: [""],
    match: RegexQuery.ALL
  });
};

// noMatch returns the regexpInfo describing a regexp that
// matches no strings at all.
RegexInfo.noMatch = function() {
  return new RegexInfo({
    match: RegexQuery.NONE
  });
};

// emptyString returns the regexpInfo describing a regexp that
// matches only the empty string.
RegexInfo.emptyString = function() {
  return new RegexInfo({
    canEmpty: true,
    exact: [""],
    match: RegexQuery.ALL
  });
};

/**
 * Adds to the match query the trigrams for matching exact
 */
RegexInfo.prototype.addExact = function() {
   if (this.exact.length) {
     this.match = this.match.andTrigrams(this.exact);
   }
};

// simplify simplifies the regexpInfo when the exact set gets too large.
RegexInfo.prototype.simplify = function(force) {
  //println("  simplify", info.String(), " force=", force)
  //defer func() { println("  ->", info.String()) }()
  // If there are now too many exact strings,
  // loop over them, adding trigrams and moving
  // the relevant pieces into prefix and suffix.
  this.exact = clean(this.exact, false);
  if (this.simplifyExact(force)) {
    this.addExact();
    for (var i = 0; i < this.exact.length; i++) {
      var s = this.exact[i];
      var n = s.length;
      if (n < 3) {
        this.prefix.push(s);
        this.suffix.push(s);
      } else {
        this.prefix.push(s.substring(0, 2));
        this.suffix.push(s.substring(n - 2));
      }
    }
    this.exact = [];
  }

  if (!this.exact.length) {
    this.prefix = this.simplifySet(this.prefix);
    this.suffix = this.simplifySet(this.suffix);
  }
};

RegexInfo.prototype.simplifyExact = function(force) {
  var doSimplify = false;
  if (this.exact.length > maxExact) {
    doSimplify = true;
  } else {
    var ml = minLen(this.exact);
    if (ml >= 4 || ml >= 3 && force) {
      doSimplify = true;
    }
  }
  return doSimplify;
};

// simplifySet reduces the size of the given set (either prefix or suffix).
// There is no need to pass around enormous prefix or suffix sets, since
// they will only be used to create trigrams.  As they get too big, simplifySet
// moves the information they contain into the match query, which is
// more efficient to pass around.
RegexInfo.prototype.simplifySet = function(s) {
  var t = clean(s, s == this.suffix);

  // Add the OR of the current prefix/suffix set to the query.
  this.match = this.match.andTrigrams(t);

  var w, i, str;
  for (var n = 3; n == 3 || t.length > maxSet; n--) {
    // Replace set by strings of length n-1.
    w = 0;
    for (i = 0; i < t.length; i++) {
      str = t[i];
      if (str.length >= n) {
        if (s == this.prefix) {
          str = str.substring(0, n - 1);
        } else {
          str = str.substring(str.length - n + 1);
        }
      }
      if (w === 0 || t[w - 1] != str) {
        t[w] = str;
        w++;
      }
    }
    t = t.slice(0, w);
    t = clean(t, s == this.suffix);
  }

  // Now make sure that the prefix/suffix sets aren't redundant.
  // For example, if we know "ab" is a possible prefix, then it
  // doesn't help at all to know that  "abc" is also a possible
  // prefix, so delete "abc".
  w = 0;
  var f = isEqualTo(s, this.suffix) ? hasSuffix : hasPrefix;
  for (i = 0; i < t.length; i++) {
    str = t[i];
    if (w === 0 || !f(str, t[w - 1])) {
      t[w] = str;
      w++;
    }
  }
  t = t.slice(0, w);
  return t;
};

var hasPrefix = function(str, prefix) {
  return str.slice(0, prefix.length) == prefix;
};

var hasSuffix = function(str, suffix) {
  return str.slice(-suffix.length) == suffix;
};

var suffixComparator = function(a, b) {
  var len = Math.min(a.length, b.length);
  for (var i = 1; i <= len; i++) {
    var ac = a.charCodeAt(a.length - i);
    var bc = b.charCodeAt(b.length - i);
    var cdelta = ac - bc;
    if (cdelta !== 0) {
      return cdelta;
    }
  }
  return a.length - b.length;
};

// clean removes duplicates from the stringSet.
var clean = function(s, isSuffix) {
  if (s.length === 0) {
    return s;
  }
  s = s.sort(isSuffix ? suffixComparator : null);
  var sPrime = [s[0]];
  for (var i = 1; i < s.length; i++) {
    var val = s[i];
    if (s[i-1] !== val) {
      sPrime.push(val);
    }
  }
  return sPrime;
};

// minLen returns the length of the shortest string in s.
var minLen = function(s) {
  if (s.length === 0) {
    return 0;
  }
  return s.reduce(function(a, b) { return Math.min(a.length, b.length); });
};

// union returns the union of s and t, reusing s's storage.
var union = function(s, t, isSuffix) {
  s = s.concat(t);
  return clean(s, isSuffix);
};

// cross returns the cross product of s and t.
var cross = function(s, t, isSuffix) {
  var p = [];
  for (var i = 0; i < s.length; i++) {
    var ss = s[i];
    for (var j = 0; j < t.length; j++) {
      p.push(ss + t[j]);
    }
  }
  return clean(p, isSuffix);
};

// isSubsetOf returns true if all strings in s are also in t.
// It assumes both sets are sorted.
var isSubsetOf = function(s, t) {
  var j = 0;
  for (var si = 0; si < s.length; si++) {
    var ss = s[si];
    while (j < t.length && t[j] < ss) {
      j++;
    }
    if (j >= t.length || t[j] != ss) {
      return false;
    }
  }
  return true;
};

var isEqualTo = function(s, t) {
  if (s.length != t.length) {
    return false;
  }
  if (s == t) {
    return true;
  }
  for (var i = 0; i < s.length; i++) {
    if (s[i] != t[i]) {
      return false;
    }
  }
  return true;
};