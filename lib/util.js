var path = require('path');

function getUnion(p1, p2) {
  var i = 0;
  var max = Math.min(p1.length, p2.length);
  while(p1[i] === p2[i] && i < max) {
    i++;
  }

  return p1.substring(0, i);
}

function expandPath(p) {
  if(p[0] === '~') {
    p = getUserHome() + p.slice(1);
  }
  return path.normalize(p);
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

var exports = module.exports = {
  getUnion: getUnion,
  expandPath: expandPath,
  normalizePath: normalizePath,
  getUserHome: getUserHome
};
