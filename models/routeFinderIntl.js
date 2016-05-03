const Graph = require('node-dijkstra');

function routeFinderIntl (price,cost) {
  //prices[#index][attr][0]
  this.prices = price;
  //costs[#index][attr][0]
  //NOTE: costs must exclude discontinued
  this.costs = cost;

  this.neigh = {};

  this.getPath = function (fro,to,pri,wei,vol) {
    const route = new Graph();
    this.getNeighbours(pri,wei,vol);
    //console.log(this.neigh);

    for (var key in this.neigh) {
      if (this.neigh.hasOwnProperty(key)) {
        console.log(key);
        route.addNode(key, this.objectify(this.neigh[key]));
      }
    }
    return route.path(fro, to,{ cost: true });
  };

  this.objectify = function (array) {
    var result = {};
    for (var i = 0; i < array.length; i++) {
      var to = array[i][0];
      var price = array[i][1];
      result[to] = parseFloat(price);
    }
    console.log(result);
    return result;
  };

  this.getNeighbours = function (pri,wei,vol) {
    for (var i = 0; i < this.prices.length; i++) {
      var from = this.prices[i]['from'][0];
      var to = this.prices[i]['to'][0];
      var weightcost = parseFloat(this.prices[i]['weightcost'][0]);
      var volumecost = parseFloat(this.prices[i]['volumecost'][0]);
      var priority = this.prices[i]['priority'][0];
      if (pri === priority) {
        if (this.neigh[from]) {
          this.neigh[from].push([to, wei*weightcost+vol*volumecost]);
        } else {
          this.neigh[from] = [[to, wei*weightcost+vol*volumecost]];
        }
      }
    }
  };


}

module.exports = routeFinderIntl;
