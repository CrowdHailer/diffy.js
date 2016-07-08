exports.start = function () {
  // Property test reduction of history should always return state
  var state = {};
  var history = [];
  return {
    getHistory: function () {
      // optionally pass in as of to start history searcg
      return history;
    },
    getState: function () {
      return Object.assign({}, state);
    },
    saveChangeset: function (changeset) {
      var patch = {};
      var valid = true;
      Object.keys(changeset).forEach(function(key){
        if (state[key] === changeset[key].from) {
          patch[key] = changeset[key].to;
        } else {
          valid = false;
          patch[key] = {remote: state[key], local: changeset[key].to};
        }
      });
      if (valid) {
        history.push(changeset);
        state = Object.assign({}, state, patch);
        return {ok: true, value: history.length};
      } else {
        return {ok: false, value: history.length};
      }
    }
  };
};