
var CREATE  = graph_create.CREATE  = 'create';
var DESTROY = graph_create.DESTROY = 'destroy';
var LINK    = graph_create.LINK    = 'link';
var UNLINK  = graph_create.UNLINK  = 'unlink';

module.exports = graph_create;

function graph_create() {
  var ret = {
    history : [],
    nodes : {},
    id : 0,
    watchers : [],
    since: 0
  };

  ret.graph_node_create = graph_node_create;
  ret.graph_node_destroy = graph_node_destroy;
  ret.graph_child_add = graph_child_add;
  ret.graph_child_remove = graph_child_remove;
  ret.graph_process_update = graph_process_update;
  ret.graph_history_since = graph_history_since;
  ret.graph_history_watch = graph_history_watch;
  ret.graph_history_append = graph_history_append;

  return ret;
}

function graph_node_create(data) {
  data = data || null;

  this.graph_history_append({
    op : CREATE,
    id : this.id,
    data: data
  });

  var node = {
    id : this.id,
    parents : [],
    children: [],
    toString : function() {
      return JSON.stringify(this, null, '  ')
    },
    data : data
  };

  this.nodes[this.id] = node;

  this.id++

  return node;
}

function graph_node_destroy(node) {
  var i;

  var children = node.children;
  for (i=0; i<children.length; i++) {
    this.graph_child_remove(node, this.nodes[children[i]]);
  }

  var parents = node.parents;
  for (i=0; i<children.length; i++) {
    this.graph_child_remove(this.nodes[parents[i]], node);
  }

  this.graph_history_append({
    op : DESTROY,
    id : node.id
  });

  delete this.nodes[node.id];
  delete node;
}

function graph_child_add(parent, child) {
  if (parent.children.indexOf(child.id) < 0) {
    parent.children.push(child.id);
  }

  if (child.parents.indexOf(parent.id) < 0) {
    child.parents.push(parent.id);
  }

  this.graph_history_append({
    op : LINK,
    parent: parent.id,
    child: child.id
  });
}

function graph_child_remove(parent, child) {
  var idx = parent.children.indexOf(child.id);
  if (idx > -1) {
    parent.children.splice(idx, 1);
  }

  var parentIdx = child.parents.indexOf(parent.id);
  if (idx > -1) {
    child.parents.splice(parentIdx, 1);
  }

  this.graph_history_append({
    op : UNLINK,
    parent : parent.id,
    child: child.id
  });
}

function graph_process_update(queue) {
  if (!Array.isArray(queue)) {
    queue = [queue];
  }

  var l = queue.length;
  var item;
  for (var i=0; i<l; i++) {
    item = queue[i];
    switch (item.op) {
      case CREATE:
        this.graph_node_create();
      break;

      case DESTROY:
        this.graph_node_destroy(this.nodes[item.id]);
      break;

      case LINK:
        this.graph_child_add(
          this.nodes[item.parent],
          this.nodes[item.child]
        );
      break;

      case UNLINK:
        this.graph_child_remove(
          this.nodes[item.parent],
          this.nodes[item.child]
        );
      break;
    }
  }
}

function graph_history_since(index) {
  index = index || 0;
  return this.history.slice(index);
}

function notify(watchers, change, since) {
  if (watchers.length) {
    var l = watchers.length;
    for (var i=0; i<l; i++) {
      watchers[i].since = since;
      watchers[i].fn(change)
    }
  }
}

function graph_history_append(change) {
  this.history.push(change);

  this.since++;
  notify(this.watchers, change, this.since);
}

function graph_history_watch(fn, since) {
  since = since || 0;

  this.watchers.push({
    fn: fn,
    since: this.since
  });

  if (since < this.since) {
    notify(this.watchers, this.history.slice(since), this.since);
  }
}
