function deepClone(obj){
  return JSON.parse(JSON.stringify(obj))
}

function Store(obj){
  obj = obj || {nodes:{}}
  var store = deepClone(obj)

  function findChildNode(nodeId){
    var [child, parent] = nodeId.split('@')
    return store.nodes[parent].switches[nodeId]
  }

  return {
    get hero(){
      return deepClone(store)
    },
    get edges(){
      var edges = []

      for(var key in store.nodes) {
        var node = store.nodes[key]

        if(node.type === 'buttons') {
          var buttons = node.switches
          for(var id in buttons) {
            var button = buttons[id]
            if (button.destination) edges.push({source:button.id, destination:button.destination})
          }
        }
        if (node.destination) edges.push({source:node.id, destination:node.destination})
      }

      return edges
    },
    getNode: function(nodeId){
      return deepClone(store.nodes[nodeId])
    },
    edgesFor: function(nodeId){
      // TO DO
    },
    modifyNode: function(modifiedNode){
      store.nodes[modifiedNode.id] = modifiedNode

      var changedNode = deepClone(modifiedNode)
      var affectedEdges = []
      var evt = new CustomEvent('node-modified', {
        detail: {
          node: changedNode,
          edges: affectedEdges
        }
      })
      window.dispatchEvent(evt)
    },
    modifyNodePosition: function(nodeId, newPosition){
      var x = store.nodes[nodeId]
      x.position = newPosition

      var changedNode = deepClone(x)
      var affectedEdges = []
      var evt = new CustomEvent('node-modified', {
        detail: {
          node: changedNode,
          edges: affectedEdges
        }
      })
      window.dispatchEvent(evt)
    },

    deleteNode: function(nodeId){
      var linkedSources = this.edges.filter(({destination}) => destination === nodeId)
      linkedSources.forEach(this.deleteEdge)

      delete store.nodes[nodeId]

      var evt = new CustomEvent('node-deleted', {detail: {node: nodeId}})
      window.dispatchEvent(evt)
    },

    addEdge: function(obj){
      var sourceNode = obj.source.includes('@') ? findChildNode(obj.source) : store.nodes[obj.source];
      sourceNode.destination = obj.destination

      var evt = new CustomEvent('edge-added', {detail: {edge: obj}});
      window.dispatchEvent(evt)
    },

    deleteEdge: function(obj){
      var node = obj.source.includes('@') ? findChildNode(obj.source) : store.nodes[obj.source]
      delete node.destination

      var evt = new CustomEvent('edge-deleted', {detail: {edge: obj}})
      window.dispatchEvent(evt)
    }
  };
};
