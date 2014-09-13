var test = require('tape');
var graph_create = require('./rpc-batch');

test('history', function(t) {
  var g = graph_create();
  var h = g.graph_node_create();
  g.graph_node_destroy(h);
  var history = g.graph_history_since(0);

  t.equal(history.length, 2);
  t.end();
});

test('basic graph manipulation', function(t) {
  var g = graph_create();

  var head = g.graph_node_create();
  var child = g.graph_node_create()
  var child2 = g.graph_node_create();

  g.graph_child_add(head, child)
  g.graph_child_add(head, child2);

  t.equal(head.children.length, 2);
  t.equal(child.parents.length, 1);
  t.equal(child2.parents.length, 1);

  g.graph_child_remove(head, child);
  g.graph_node_destroy(child);

  t.end();
});

test('full update (create)', function(t) {
  var local = graph_create();

  var h = local.graph_node_create();

  var remote = graph_create();

  remote.graph_process_update(
    local.graph_history_since(0)
  );

  t.deepEqual(
    remote.graph_history_since(0),
    local.graph_history_since(0)
  );

  t.end();
});

test('full update (create + destroy)', function(t) {
  var local = graph_create();

  var h = local.graph_node_create();
  local.graph_node_destroy(h);

  var remote = graph_create();

  remote.graph_process_update(
    local.graph_history_since(0)
  );

  t.deepEqual(
    remote.graph_history_since(0),
    local.graph_history_since(0)
  );

  t.end();
});

test('history watch', function(t) {
  var expected = [graph_create.CREATE, graph_create.DESTROY];
  var saw = [];

  var local = graph_create();

  local.graph_history_watch(function(change) {
    saw.push(change.op);
  });

  local.graph_node_destroy(local.graph_node_create());

  t.deepEqual(saw, expected);

  t.end();
});

test('pipe changes directly to remote', function(t) {
  var local = graph_create();
  var remote = graph_create();

  local.graph_history_watch(remote.graph_process_update.bind(remote));

  local.graph_node_create();

  t.equal(remote.graph_history_since(0).length, 1);

  t.end();
});

test('incremental history sync', function(t) {
  var local = graph_create();
  var remote = graph_create();

  local.graph_history_watch(remote.graph_process_update.bind(remote));

  var a = local.graph_node_create();
  var b = local.graph_node_create();
  var c = local.graph_node_create();

  local.graph_child_add(a, b);
  local.graph_child_add(a, c);
  local.graph_child_remove(a, c);
  local.graph_child_add(c, a);

  local.graph_node_destroy(c);

  t.deepEqual(
    remote.graph_history_since(0),
    local.graph_history_since(0)
  );

  t.end();
});

test('graph_history_watch - full sync on attach', function(t) {
  var local = graph_create();
  var remote = graph_create();

  var a = local.graph_node_create();
  var b = local.graph_node_create();
  var c = local.graph_node_create();

  local.graph_child_add(a, b);
  local.graph_child_add(a, c);
  local.graph_child_remove(a, c);
  local.graph_child_add(c, a);

  local.graph_node_destroy(c);

  local.graph_history_watch(remote.graph_process_update.bind(remote));

  t.deepEqual(
    remote.graph_history_since(0),
    local.graph_history_since(0)
  );

  t.end();
});
