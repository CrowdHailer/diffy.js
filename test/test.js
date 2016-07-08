var assert = require('chai').assert;

var Server = {
  start: function () {
    // Property test reduction of history should always return state
    var state;
    var history = [];
    return {
      getHistory: function () {
        // optionally pass in as of to start history searcg
        return history;
      },
      saveChangeset: function (patch) {
        history.push(patch);
        return {ok: true};
      }
    };
  }
};

var Client =  {
  start: function (server) {
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
  }
};

describe('Central Server', function () {
  describe('viewing', function () {
    it('should start with an empty history', function () {
      var server = Server.start({});
      assert.equal(0, server.getHistory().length);
    });
  });
});
describe('Client', function () {
  describe('editing a value', function () {
    // localchanges rename to change set
    it('should start with an empty set of changes', function () {
      var client = Client.start();
      assert.equal(Object.keys(client.getChangeset()).length, 0);
    });
    it('should be added to the changeset', function () {
      var client = Client.start();
      client.setValue('foo', 'something');
      assert.equal(Object.keys(client.getChangeset()).length, 1);
    });
    it('should change the value locally', function () {
      var client = Client.start();
      client.setValue('foo', 'something');
      assert.equal(client.getLocalState().foo, 'something');
    });
    it('should modify the changeset for a second change to a key', function () {
      var client = Client.start();
      client.setValue('foo', 'something');
      client.setValue('foo', 'else');
      assert.equal(client.getLocalState().foo, 'else');
    });
    // Should delete change if changes to some server value
  });
  describe('saving changes', function () {
    it('should clear changeset is server accepts changes', function () {
      var client = Client.start({saveChangeset: function () { return {ok: true}; }});
      client.setValue('foo', 'bar');
      client.saveChangeset();
      assert.deepEqual(client.getChangeset(), {});
    });
    // Should not try to save if conflicts remain
  });
});
describe('Client Server interaction', function () {
  it('should follow this story of two halves', function () {
    var server = Server.start({});
    var clientA = Client.start(server);

    clientA.setValue('foo', 'first');
    assert.equal(clientA.getLocalState().foo, 'first');
    assert.deepEqual(clientA.getChangeset().foo, {from: undefined, to: 'first'});

    clientA.saveChangeset();

    var clientB = Client.start(server);
    clientB.checkServer();
    assert.equal(clientB.getLocalState().foo, 'first');

    clientB.setValue('foo', 'second');
    clientB.saveChangeset();

    clientA.setValue('foo', 'other');
    clientA.checkServer();
    assert.deepEqual(clientA.getLocalState().foo, {remote: 'second', local: 'other'});
    clientA.setValue('foo', 'altogether different');
    assert.deepEqual(clientA.getLocalState().foo, 'altogether different');
  });
});
