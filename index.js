var _ = require('underscore');
var path = require('path');
var findit = require('findit');
var fuzzy = require('fuzzy');


var claire = module.exports = {
  defaultFilters: ['.git', 'node_modules']
};

claire.find = function(term, root, callback, opts) {
  var terms = term.split('/');
  opts = opts || {};

  var skipDirs = opts.filters || claire.defaultFilters;
  var matches = [];
  var finder = findit(root);

  finder.on('directory', function(dir, stat, stop) {

    if(_.contains(skipDirs, path.basename(dir))) {
      return stop();
    }

    var dirs = dir.split('/');
    if(dirs.length > terms.length) {
      return stop();
    }

    var tail = dirs.length - 1;
    if(!fuzzy.match(terms[tail], dirs[tail]) && dirs[tail]) {
      return stop();
   }
  });

  finder.on('file', function(file, stat) {
    var matchOpts = {pre: opts.pre, post: opts.post};
    var match = fuzzy.match(term, file, matchOpts)
    if(!match) {
      return;
    }

    match.file = file;

    if(opts.short) {
      var i = 0;
      var lastSlash = 0;
      for(i = 0; i < file.length; i++) {
        if(file[i] != term[i]) {
          break;
        }
        if(i && file[i] == '/') {
          lastSlash = i + 1;
        }
      }

      match.short = file.slice(lastSlash);

      if(lastSlash) {
        match.rendered = fuzzy.match(term.slice(lastSlash), file.slice(lastSlash), matchOpts).rendered;
      }
    }

    matches.push(match);
  });

  finder.on('end', function(err) {
    console.log('DONE');
    callback(err, matches);
  });
}

module.exports = claire;

// Ex.:
claire.find('/Users/jcole/re/p/cl/ke', '/Users', console.log, {short: true});
