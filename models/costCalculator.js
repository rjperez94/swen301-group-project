function costCalculator (cost,path,discontinued,local) {
  //costs[#index][attr][0]
  //NOTE: costs must exclude discontinued and local 'to'
  this.costs = [];
  for (var i = 0; i < cost.length; i++) {
    this.costs.push(cost[i]);
  }

  this.path = path;

  this.getTransport = function (pri,wei,vol) {
    var transport = [];
    var reserved = {};
    this.removeDiscontinued(this.costs, discontinued);

    for (var h = 1; h < path.length; h++) {
      var abort = false;
      var hasReserved = false;
      for (var i = this.costs.length-1; i >=0 && abort !== true; i--) {
        var from = this.costs[i]['from'][0];
        var dest = this.costs[i]['to'][0];
        //International standard priority requires that the mail be transferred by land or sea (unless air transfer is the only option).
        //International air priority requires the mail to be transferred by air.International standard priority requires that the mail be transferred by land or sea
        var validType = this.validType(pri, this.costs[i]['type'][0]);
        var weightcost = this.costs[i]['weightcost'][0];
        var volumecost = this.costs[i]['volumecost'][0];
        var maxWeight = this.costs[i]['maxWeight'][0];
        var maxVolume = this.costs[i]['maxVolume'][0];

        if (path[h-1] === from && path[h] === dest && wei <= maxWeight && vol <= maxVolume) {
          if(validType === true) {
            transport.push(this.costs[i]);
            abort = true;
          } else if (hasReserved !== true) {
            //International standard priority requires that the mail be transferred by land or sea (unless air transfer is the only option).
            //this reserves the route just in case
            reserved[h] = this.costs[i];
            hasReserved = true;
          }
        }

        //International standard priority requires that the mail be transferred by land or sea (unless air transfer is the only option).
        //this fulfills the unless clause
        if (i === 0 && abort === false) {
          transport.push(reserved[h]);
        }

      }
    }

    var expenses = 0;
    for (var i = 0; i < transport.length; i++) {
      expenses += transport[i]['weightcost'][0]*wei+transport[i]['volumecost'][0]*vol;
    }
    return {"firms":transport,"expenses":expenses};
  };

  this.validType = function (mailPriority,firmType) {
    if (mailPriority === 'International Standard' && (firmType === 'Land' || firmType === 'Sea')) {
      return true;
    } else if (mailPriority === 'International Air' && firmType === 'Air') {
      return true;
    }
    return false;
  }

  this.removeDiscontinued = function (cost,discontinued) {
    var indexesToRemoveFromCost = [];

    //find
    for (var i = 0; i < discontinued.length; i++) {
      var company = discontinued[i]['company'][0];
      var type = discontinued[i]['type'][0];
      var from = discontinued[i]['from'][0];
      var to = discontinued[i]['to'][0];

      for (var j = 0; j < cost.length; j++) {
        var company2 = cost[j]['company'][0];
        var type2 = cost[j]['type'][0];
        var from2 = cost[j]['from'][0];
        var to2 = cost[j]['to'][0];
        // console.log(j);
        // console.log(company+company2);
        // console.log(type+type2);
        // console.log(from+from);
        // console.log(to+to2);
        if (company===company2 && type===type2 && from===from2 && to===to2) {
          indexesToRemoveFromCost.push(j);
        }
      }
    }
    //console.log(indexesToRemoveFromCost);

    //delete
    for (var i = 0; i < indexesToRemoveFromCost.length; i++) {
      var index = indexesToRemoveFromCost[i];
      delete cost[index];
    }
    //remove nulls
    for (var i = 0; i < indexesToRemoveFromCost.length; i++) {
      var index = indexesToRemoveFromCost[i];
      cost.splice(index,1);
    }

  }

  this.removeNull = function (cost) {
    var result = [];
    for (var i = 0; i < cost.length; i++) {
      if(cost[i] !== undefined && cost[i] !== null) {
        result.push(cost[i]);
        //console.log(cost[i]);
      }
    }
    return result;
  }

}

module.exports = costCalculator;
