const Graph = require('node-dijkstra');
var tools = new (require('../models/tools.js'));

function routeFinder(cost,discontinued,local) {
  //costs[#index][attr][0]
  //NOTE: costs must exclude discontinued and local 'to'
  this.costs = [];
  for (var i = 0; i < cost.length; i++) {
    this.costs.push(cost[i]);
  }
  this.discontinued = discontinued;
  this.locals = local;

  this.isLocal = true;

  this.neigh = {};

  this.getPath = function (fro,to,pri,wei,vol,includeAir) {
    if (this.locals.indexOf(to) < 0) {
      this.isLocal = false;
    }

    const route = new Graph();
    this.getNeighbours(pri,wei,vol,includeAir);
    //console.log(this.neigh);

    for (var key in this.neigh) {
      if (this.neigh.hasOwnProperty(key)) {
        //console.log(key);
        route.addNode(key, this.objectify(this.neigh[key]));
      }
    }
    var pathCost = route.path(fro, to,{ cost: true });
    if(pathCost['path'] === null) {
      return null;
    } else {
      pathCost['transport'] = this.getTransport(pathCost['path']);
      return pathCost;
    }
  }

  this.getTransport = function(path) {
    var result = [];
    for (var i = 1; i < path.length; i++) {
      var abort = false;
      var instance = this.neigh[path[i-1]];
      for (var j = 0; j < instance.length && abort === false; j++) {
        if (instance[j][1] === path[i]) {
          result.push(instance[j][3]+' by '+instance[j][4]);
          abort = true;
        }
      }
    }
    return result;
  }

  this.objectify = function (array) {
    var result = {};
    for (var i = 0; i < array.length; i++) {
      var cost = array[i][0];
      var to = array[i][1];
      result[to] = parseFloat(cost);
    }
    //console.log(result);
    return result;
  };

  this.getNeighbours = function (pri,wei,vol,includeAir) {
    tools.removeDiscontinued(this.costs, this.discontinued);

    for (var i = this.costs.length - 1; i >= 0; i--) {
      var company = this.costs[i]['company'][0];
      var from = this.costs[i]['from'][0];
      var to = this.costs[i]['to'][0];
      var weightcost = parseFloat(this.costs[i]['weightcost'][0]);
      var volumecost = parseFloat(this.costs[i]['volumecost'][0]);
      var type = this.costs[i]['type'][0];
      //International standard priority requires that the mail be transferred by land or sea (unless air transfer is the only option).
      //International air priority requires the mail to be transferred by air.International standard priority requires that the mail be transferred by land or sea
      var validType = this.validType(pri, type, includeAir);
      var maxWeight = this.costs[i]['maxWeight'][0];
      var maxVolume = this.costs[i]['maxVolume'][0];
      var forLocal = this.checkLocal(from,to);

      if (validType && wei <= maxWeight && vol <= maxVolume && forLocal === true) {
        if (this.neigh[from]) {
          if(this.contains(this.neigh[from], to,from,company,type) === false) {
            this.neigh[from].push([wei*weightcost+vol*volumecost, to, from, company, type]);
          }
        } else {
          this.neigh[from] = [[wei*weightcost+vol*volumecost, to, from, company, type]];
        }
      }

    }

  }

  this.contains = function(array2d, to,from,company,type)  {
    for (var i = 0; i < array2d.length; i++) {
      if (array2d[i][1] === to &&
      array2d[i][2] === from &&
      array2d[i][3] === company &&
      array2d[i][4] === type) {
        return true;
      }
    }
    return false;
  }

  this.checkLocal = function(from,to) {
    if(this.isLocal === true && (this.locals.indexOf(from) < 0 || this.locals.indexOf(to) < 0)) {
      return false;
    }
    return true;
  }

  this.validType = function (mailPriority,firmType,includeAir) {
    if (mailPriority === 'Standard' && (firmType === 'Land' || firmType === 'Sea')) {
      return true;
    } else if (mailPriority === 'Air' && firmType === 'Air') {
      return true;
    } else if (mailPriority === 'Standard' && includeAir) {
      return true;
    }
    return false;
  }

}

module.exports = routeFinder;
