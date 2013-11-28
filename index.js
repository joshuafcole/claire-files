var _ = require('underscore');
var path = require('path');
var findit = require('findit');
var fuzzy = require('fuzzy');


var claire = module.exports = {
  defaultFilters: ['.git', 'node_modules']
};

claire.find = function(term, root, callback, opts) {
  if(root[root.length - 1] !== '/') {
    root += '/';
  }
  opts = opts || {};

  var skipDirs = opts.filters || claire.defaultFilters;
  var matches = [];
  var finder = findit(root);

  var matchOpts = {pre: opts.pre, post: opts.post};
  finder.on('directory', function(dir, stat, stop) {
    if(_.contains(skipDirs, path.basename(dir))) {
      return stop();
    }

    var relative = dir.slice(root.length);
    var match = fuzzy.match(term, relative, matchOpts);
    if(match) {
      match.dir = dir;
      match.file = '';
      matches.push(match);
    }

    // Depth 0
    if(relative.length) {
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
        var i = 0;
        var cutoff = 0;

        var relative = match.dir.slice(root.length);
        while(i < relative.length) {
          if(relative[i] !== term[i]) {
            break;
          }

          if(term[i] === '/') {
            cutoff = i + 1;
          }
          i++;
        }
        if(i === relative.length) {
          cutoff = i;
        }
        match.dir = relative.slice(cutoff);
        match.shared = root + relative.slice(0, cutoff);
      }

      // Normalize directories.
      if(match.dir && match.dir[match.dir.length - 1] != '/') {
        match.dir += '/';
      }
    });

    callback(err, matches);
  });
};

module.exports = claire;

// Ex.:
claire.find('c', '/home/josh/repos/phobos/', function(err, matches) {
  if(err) {
    console.log('ERROR:', err);
  }

  _.each(matches, function(match) {
    console.log(match.shared, '|', match.dir + match.file, match.score);
  });
}, {short: true});



function getRoot(term, opts) {
  var root = '';
  var parts = term.split(path.sep);
  for(var i = 0; i < parts.length; i++) {
    try {
      var tryPath = path.join(root, parts[i]);
      var stat = fs.statSync(tryPath);
      if(!stat.isDir()) {
        break;
      }
    } catch (e) {
      break;
    }
  }
  return root;
}

function find2(term, callback, opts) {
  opts = opts || {};
  var root = getRoot(term, opts);


}
