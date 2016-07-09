var assert = require('chai').assert;

var Server = require('./server');
var Client = require('./client');

describe('Central Server', function () {
  // change viewing to version
  describe('viewing history', function () {
    it('should start with an empty history', function () {
      var server = Server.start({});
      assert.equal(0, server.getHistory().length);
    });
  });
  describe('saving a changeset', function () {
    it('should return the new version', function () {
      var server = Server.start();
      var response = server.saveChangeset({myKey: {to: 'initial'}});
      assert.equal(response.ok, true);
      assert.equal(response.value, 1);
    });
    it('should apply the changeset to recorded state', function () {
      var server = Server.start();
      var response = server.saveChangeset({myKey: {to: 'initial'}});
      assert.equal(response.ok, true);
      assert.equal(server.getState().myKey, 'initial');
    });
    it('should not save an invalid changeset', function () {
      var server = Server.start();
      var response = server.saveChangeset({myKey: {from: 'rubbish', to: 'clean'}});
      assert.equal(response.ok, false);
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
      client.setValue('myKey', 'something');
      assert.equal(Object.keys(client.getChangeset()).length, 1);
    });
    it('should change the value locally', function () {
      var client = Client.start();
      client.setValue('myKey', 'something');
      assert.equal(client.getLocalState().myKey, 'something');
    });
    it('should work for multiple values', function () {
      var client = Client.start();
      client.setValue('myKey', 'something');
      client.setValue('myOtherKey', 'other');
      assert.equal(client.getLocalState().myKey, 'something');
      assert.equal(client.getLocalState().myOtherKey, 'other');
    });
    it('should modify the changeset for a second change to a key', function () {
      var client = Client.start();
      client.setValue('myKey', 'something');
      client.setValue('myKey', 'else');
      assert.equal(client.getLocalState().myKey, 'else');
    });
    xit('should have a clean changeset when returning value to server value', function () {
      var client = Client.start();
      client.setValue('myKey', 'something');
      client.setValue('myKey');
      assert.deepEqual(client.getChangeset(), {});
    });
  });
  describe('saving changes', function () {
    it('should clear changeset is server accepts changes', function () {
      var client = Client.start({saveChangeset: function () { return {ok: true}; }});
      client.setValue('foo', 'bar');
      client.saveChangeset();
      assert.deepEqual(client.getChangeset(), {});
    });
    it('should have updated values on local state', function () {
      var client = Client.start({saveChangeset: function () { return {ok: true}; }});
      client.setValue('foo', 'bar');
      client.saveChangeset();
      assert.equal(client.getLocalState().foo, 'bar');
    });
    // Should not try to save if conflicts remain
  });
  describe('checking the server', function () {
    it('should update local state', function () {
      var client = Client.start({
        getHistory: function () {
          return [{foo: {from: undefined, to: 'existing'}}];
        }
      });
      client.checkServer();
      assert.equal(client.getLocalState().foo, 'existing');
    });
    it('should report conflict from server', function () {
      var client = Client.start({
        getHistory: function () {
          return [{foo: {from: undefined, to: 'existing'}}];
        }
      });
      client.setValue('foo', 'my value');
      client.checkServer();
      assert.deepEqual(client.getLocalState().foo, {remote: 'existing', local: 'my value'});
    });
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
    // var changeset = clientB.getChangeset();
    // server.saveChangeset(changeset);
    assert.equal(clientA.getLocalState().foo, 'first');
    clientB.saveChangeset();
    assert.equal(clientA.getLocalState().foo, 'first');

    clientA.setValue('foo', 'other');
    clientA.checkServer();
    assert.deepEqual(clientA.getLocalState().foo, {remote: 'second', local: 'other'});
    clientA.setValue('foo', 'altogether different');
    assert.deepEqual(clientA.getLocalState().foo, 'altogether different');
  });
});
