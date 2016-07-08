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
      var response = server.saveChangeset({foo: {to: 'initial'}});
      assert.equal(response.ok, true);
      assert.equal(response.value, 1);
    });
    it('should apply the changeset to recorded state', function () {
      var server = Server.start();
      var response = server.saveChangeset({foo: {to: 'initial'}});
      assert.equal(response.ok, true);
      assert.equal(server.getState().foo, 'initial');
    });
    it('should not save an invalid changeset', function () {
      var server = Server.start();
      var response = server.saveChangeset({foo: {from: 'rubbish', to: 'clean'}});
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
