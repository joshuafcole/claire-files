var _ = require('underscore');
_.str = require('underscore.string');
var fs = require('fs');
var path = require('path');
var findit = require('findit');
var fuzzy = require('fuzzy');


var claire = module.exports = {
  defaultFilters: ['.git', 'node_modules']
};

function expandPath(p) {
  if(p[0] === '~') {
    p = getUserHome() + p.slice(1);
  }
  return path.normalize(p);
}

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
  root = normalizePath(root);
  return root;
}

function getRelativeTerm(term, root) {
  term = term.slice(root.length);
  if(term[term.length - 1] === '/') {
    term = term.slice(0, term.length - 1);
  }
  return _.str.trim(term, '/');
}

function shorten(term, match, opts) {
  var i = 0;
  var cutoff = 0;

  var dir = match.dir;
  while(i < dir.length) {
    if(dir[i] !== term[i]) {
      break;
    }

    if(term[i] === '/') {
      cutoff = i + 1;
    }
    i++;
  }
  if(i === dir.length) {
    cutoff = i;
  }
  match.dir = dir.slice(cutoff);
  match.shared = dir.slice(0, cutoff);
  var matchOpts = {pre: opts.pre, post: opts.post};
  var filepath = path.join(match.dir, match.file);
  term = getRelativeTerm(term, match.shared);

  var relativeMatch = fuzzy.match(term, filepath, matchOpts);
  if(relativeMatch) {
    match.rendered = relativeMatch.rendered;
  }
}

function normalizePath(path) {
  if(path && path[path.length - 1] != '/') {
    path += '/';
  }
  return path;
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

claire.find = function(term, callback, opts) {
  term = expandPath(term);
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
      match.dir = normalizePath(dir);
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
      match.dir = normalizePath(match.dir);
      match.shared = normalizePath(match.shared);
    });

    callback(err, matches);
  });
};

module.exports = claire;
