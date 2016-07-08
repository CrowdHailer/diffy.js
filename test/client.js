exports.start = function (server) {
  // record latest server timestamp
  state = {};
  var changeset = {}; // Patch, Revision
  return {
    setValue: function (key, value) {
      changeset[key] = {from: state[key], to: value};
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
      response = server.saveChangeset(changeset);
      if (response.ok) {
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
    }
  };
};
