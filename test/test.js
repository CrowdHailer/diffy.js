var assert = require('chai').assert;

var Server = {
  start: function () {
    var state
    var history = []
    return {
      getHistory: function () {
        return history
      },
      submitPatch: function (patch) {
        history.push(patch)
        return {ok: true}
      }
    }
  }
}

var Client =  {
  start: function (server) {
    state = {}
    var changeSet = {}
    return {
      setValue: function (key, value) {
        changeSet[key] = {from: state[key], to: value}
      },
      getLocalState: function () {
        var patch = {}
        Object.keys(changeSet).forEach(function(key){
          if (state[key] === changeSet[key].from) {
            patch[key] = changeSet[key].to
          } else {
            patch[key] = {remote: state[key], local: changeSet[key].to}
          }
        })
        return Object.assign({}, state, patch)
      },
      getLocalChanges: function () {
        return changeSet
      },
      saveChanges: function () {
        response = server.submitPatch(changeSet)
        if (response.ok) {
          changeSet = {}
        }
      },
      checkServer: function () {
        var patch = {}
        server.getHistory().forEach(function (changeSet) {
          Object.keys(changeSet).forEach(function(key){
            patch[key] = changeSet[key].to
          })
        })
        state = Object.assign({}, state, patch)
      }
    }
  }
}

describe('Central Server', function () {
  describe('viewing', function () {
    it('should start with an empty history', function () {
      var server = Server.start({})
      assert.equal(0, server.getHistory().length)
    });
  })
});
describe('Client', function () {
  describe('editing a value', function () {
    // localchanges rename to change set
    it('should start with an empty set of changes', function () {
      var client = Client.start()
      assert.equal(Object.keys(client.getLocalChanges()).length, 0)
    });
    it('should be added to the changeset', function () {
      var client = Client.start()
      client.setValue('foo', 'something')
      assert.equal(Object.keys(client.getLocalChanges()).length, 1)
    });
    it('should change the value locally', function () {
      var client = Client.start()
      client.setValue('foo', 'something')
      assert.equal(client.getLocalState().foo, 'something')
    });
    it('should modify the changeset for a second change to a key', function () {
      var client = Client.start()
      client.setValue('foo', 'something')
      client.setValue('foo', 'else')
      assert.equal(client.getLocalState().foo, 'else')
    });
  })
  describe('saving changes', function () {
    it('should clear changeset is server accepts changes', function () {
      var client = Client.start({submitPatch: function () { return {ok: true}}})
      client.setValue('foo', 'bar')
      client.saveChanges()
      assert.deepEqual(client.getLocalChanges(), {})
    })
  })
});
describe('Client Server interaction', function () {
  it('should follow this story of two halves', function () {
    var server = Server.start({})
    var clientA = Client.start(server)

    clientA.setValue('foo', 'first')
    assert.equal(clientA.getLocalState().foo, 'first')
    assert.deepEqual(clientA.getLocalChanges().foo, {from: undefined, to: 'first'})

    clientA.saveChanges()

    var clientB = Client.start(server)
    clientB.checkServer()
    assert.equal(clientB.getLocalState().foo, 'first')

    clientB.setValue('foo', 'second')
    clientB.saveChanges()

    clientA.setValue('foo', 'other')
    clientA.checkServer()
    assert.deepEqual(clientA.getLocalState().foo, {remote: 'second', local: 'other'})
    clientA.setValue('foo', 'altogether different')
    assert.deepEqual(clientA.getLocalState().foo, 'altogether different')
  })
});
