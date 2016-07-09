exports.start = function (server) {
  'use strict';
  // record latest server timestamp
  var state = Object.freeze({});
  var changeset = Object.freeze({}); // Patch, Revision
  return {
    setValue: function (key, value) {
      var change = {from: state[key], to: value};
      var tmp = {};
      tmp[key] = change;
      var newChangeset = Object.assign({}, changeset, tmp);
      if (change.from === change.to) {
        delete newChangeset[key];
      }
      changeset = newChangeset;
    },
    getLocalState: function () {
      var patch = {};
      Object.keys(changeset).forEach(function(key){
        if (state[key] === changeset[key].from) {
          patch[key] = changeset[key].to;
        } else {
          patch[key] = {remote: state[key], local: changeset[key].to};
        }
      });
      return Object.assign({}, state, patch);
    },
    getChangeset: function () {
      return changeset;
    },
    saveChangeset: function () {
      var response = server.saveChangeset(changeset);
      if (response.ok) {
        var patch = {};
        Object.keys(changeset).forEach(function(key){
          if (state[key] === changeset[key].from) {
            patch[key] = changeset[key].to;
          } else {
            patch[key] = {remote: state[key], local: changeset[key].to};
          }
        });
        state = Object.assign({}, state, patch);
        changeset = {};
      }
    },
    checkServer: function () {
      var patch = {};
      server.getHistory().forEach(function (changeset) {
        Object.keys(changeset).forEach(function(key){
          patch[key] = changeset[key].to;
        });
      });
      state = Object.assign({}, state, patch);
    },
    state: state
  };
};
