var _ = require('underscore');
_.str = require('underscore.string');
var fs = require('fs');
var path = require('path');
var findit = require('findit');
var fuzzy = require('fuzzy');

var util = require('./lib/util');

var claire = module.exports = {
  defaultFilters: ['.git', 'node_modules']
};

/*\
|*| Infer the search root experimentally.
\*/
function getRoot(term, opts) {
  var root = '/';
  var parts = term.split(path.sep);
  parts.shift();

  for(var i = 0; i < parts.length; i++) {
    var tryPath = path.join(root, parts[i]);
    try {
      var stat = fs.statSync(tryPath);
      if(!stat.isDirectory()) {
        break;
      }
    } catch (e) {
      if(e.code === 'ENOENT') {
        break;
      }
      throw e;
    }
    root = tryPath;
  }
  root = util.normalizePath(root);
  return root;
}

/*\
|*| Calculate the relative search term based on the given root.
\*/
function getRelativeTerm(term, root) {
  term = term.slice(root.length);
  if(term[term.length - 1] === '/') {
    term = term.slice(0, term.length - 1);
  }
  return _.str.trim(term, '/');
}

/*\
|*| Shorten directories of matches by pulling out the root.
\*/
function shorten(term, match, opts) {
  var matchOpts = {pre: opts.pre, post: opts.post};

  match.shared = util.getUnion(term, match.dir);
  var cutoff = match.shared.lastIndexOf('/');
  match.dir = match.dir.slice(cutoff);
  var filepath = path.join(match.dir, match.file);
  term = getRelativeTerm(term, match.shared);

  var relativeMatch = fuzzy.match(term, filepath, matchOpts);
  if(relativeMatch) {
    match.rendered = relativeMatch.rendered;
  }
}

/*\
|*| Where the magic happens. Search depth currently limited to 1 directory at a time.
|*| Intended to be called repeatedly as the user refines her search.
\*/
claire.find = function(term, callback, opts) {
  term = util.expandPath(term);
  opts = opts || {};
  var skipDirs = opts.filters || claire.defaultFilters;
  var matches = [];

  var root = getRoot(term, opts);
  //term = getRelativeTerm(term, root);
  var finder = findit(root);
  var matchOpts = {pre: opts.pre, post: opts.post};

  finder.on('directory', function(dir, stat, stop) {
    if(_.contains(skipDirs, path.basename(dir))) {
      return stop();
    }

    var match = fuzzy.match(term, dir, matchOpts);
    if(match) {
      match.dir = util.normalizePath(dir);
      match.file = '';
      matches.push(match);
    }

    // Depth 0 only
    if(dir !== root) {
      return stop();
    }
  });

  finder.on('file', function(file, stat) {
    var match = fuzzy.match(term, file, matchOpts);
    if(!match) {
      return;
    }

    match.dir = path.dirname(file);
    match.file = path.basename(file);
    matches.push(match);
  });

  finder.on('end', function(err) {

    matches = _.sortBy(matches, function(match) {
      return -match.score;
    });

    _.each(matches, function(match) {
      // Slice off shared path between search term and directory.
      if(opts.short) {
        shorten(term, match, opts);
      }

      // Normalize directories.
      match.dir = util.normalizePath(match.dir);
      match.shared = util.normalizePath(match.shared);
    });

    callback(err, matches);
  });
};

module.exports = claire;
