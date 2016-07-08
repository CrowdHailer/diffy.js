var assert = require('chai').assert;

// function updateValue (current, events) {
//   var toRemove = events[0]
//   if (current ===  toRemove) {
//     return events[1]
//   } else {
//     return [current, events[1]]
//   }
// }
//
// function eventsForAttribute (attribute, events) {
//   return events.map(function (eventWithAttribute) {
//     return eventWithAttribute[1]
//   });
// }


function Client () {
  var state = {foo: 'initial'}
  var eventsToApply = []
  function localFoo () {
    if (eventsToApply.length === 2) {
      newFoo = updateValue(state.foo, eventsForAttribute('foo', eventsToApply))
    } else {
      newFoo = state.foo
    }
    return newFoo
  }

  return {
    set: function (attribute, value) {
      var current = state[attribute]
      // [unset, set]
      eventsToApply = [[attribute, current], [attribute, value]]
    },
    saveEvents: function (canonical) {
      var newFoo = localFoo()
      if (newFoo.length === 2) {
        throw new Error('returned a conflict')
      }
      canonical.push(eventsToApply)
      eventsToApply = []
      state = Object.assign({}, state, {foo: newFoo})
    },
    serverUpdates: function (events){
      var newFoo = updateValue(state.foo, eventsForAttribute('foo', events))
      state = Object.assign({}, state, {foo: newFoo})
    },
    resolve: function (attribute, resolution) {
      // simply regenerate set event, i.e. confirm changes after seeing error
      this.set(attribute, resolution)
    },
    getState: function (){
      return Object.assign({}, state, {foo: localFoo()})
    },
    getLocalDiff: function () {
      return eventsToApply
    }
  }
}

function startServer (state) {
  var state = state || {foo: 'initial'}
  var history = []
  function recordDiff (changes) {
    var key = changes.key
    if (state[key] === changes.from) {
      var t = history.length + 1
      changes.t = t
      state[key] = changes.to
      state.t = t
      history.push(changes)
      return state
    } else {
      return {
        ok: false
      }
    }
  }
  function getState () {
    // optionally pass in as of
    return Object.assign({}, state)
  }
  return {
    recordDiff: recordDiff,
    getState: getState,
    getHistory: function () {
      return history
    }
  }
}

var Server = {
  start: startServer
}

Client.start = function (server) {
  state = {}
  var localChanges = []
  return {
    setValue: function (key, value) {
      localChanges.push({key: key, from: state.key, to: value})
    },
    getLocalState: function () {
      var patch = {}
      localChanges.forEach(function(change){
        patch[change.key] = change.to
      })
      return Object.assign({}, state, patch)
    },
    saveChanges: function () {
      if (localChanges[0]) {
        var response = server.recordDiff(localChanges[0])
      }
    },
    checkServer: function () {
      var history = server.getHistory()
      var patch = {}
      history.forEach(function(change){
        patch[change.key] = change.to
      })
      state = Object.assign({}, state, patch)
    }
  }
}


xdescribe('Client Server interaction', function() {
  it('should follow this story of two halves', function () {
    var server = Server.start({})
    assert.equal(0, server.getHistory().length)

    var clientA = Client.start(server)
    var clientB = Client.start(server)

    // no need for local ordering single patch
    // Name patch
    clientA.setValue('foo', 'first')
    assert.equal(clientA.getLocalState().foo, 'first')
    // Alternative getValue('foo') -> UNSET
    assert.equal(clientB.getLocalState().foo, undefined)

    clientA.saveChanges()
    // Local diff should be clean
    // central version should change from 0 to 1
    // version awareness

    clientB.checkServer()
    assert.equal(clientB.getLocalState().foo, 'first')

    clientB.setValue('foo', 'second')
    clientB.saveChanges()
    clientA.setValue('foo', 'other')
    // assert.throw(function () {
    //   var response = clientA.saveChanges()
    //   console.log(response)
    // })
  })
  it('should follow this story', function () {
    var canonical = []
    client = Client()
    client.set('foo', 'second')

    assert.equal(client.getState().foo, 'second')
    assert.equal(2, client.getLocalDiff().length)

    client.saveEvents(canonical)
    assert.equal(client.getState().foo, 'second')
    assert.equal(0, client.getLocalDiff().length)

    var updates = [['foo', 'second'], ['foo', 'third']]
    canonical.push(updates)
    client.serverUpdates(updates)
    assert.equal(client.getState().foo, 'third')
    assert.equal(0, client.getLocalDiff().length)

    client.set('foo', 'second') // Client decideds to move back
    updates = [['foo', 'third'], ['foo', 'fourth']]
    canonical.push(updates)
    client.serverUpdates(updates)
    assert.deepEqual(client.getState().foo, ['fourth', 'second'])
    assert.equal(2, client.getLocalDiff().length)
    assert.throw(function () {
      client.saveEvents(canonical)
    })

    client.resolve('foo', 'second')
    assert.equal(client.getState().foo, 'second')
    assert.equal(2, client.getLocalDiff().length)
    client.saveEvents(canonical)

    client.set('foo', 'first') // Client decideds to move back
    updates = [['foo', 'second'], ['foo', 'third']]
    canonical.push(updates)
    client.serverUpdates(updates)
    assert.deepEqual(client.getState().foo, ['third', 'first'])
    client.resolve('foo', 'third') // Go with server opinion this time
    client.saveEvents(canonical)
    // console.log(canonical)
  })
});
xdescribe('A Server', function () {
  describe('adding diffs to the history', function () {
    it('should add valid diffs', function () {
      // Property test reduction of history should always return state
      var server = startServer()

      var state = server.recordDiff({key: 'foo', from: 'initial', to: 'second'})
      console.log(state)
      assert.equal('second', server.getState().foo)
      assert.equal(1, server.getHistory().length)

      // this should fail
      server.recordDiff({key: 'foo', from: 'initial', to: 'third'})
      assert.equal('second', server.getState().foo)
      assert.equal(1, server.getHistory().length)
    })
  })
})
