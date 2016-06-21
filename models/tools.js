var fs = require('fs');
var xml2js = require('xml2js');
var builder = new xml2js.Builder();

function tools () {
  //check if file exist
  this.getFileRealPath = function(path){
    try {
      return fs.realpathSync(path);
    } catch(e){
      return false;
    }
  }

  //check username
  this.getIndex = function(users, name){
    if (users) {
      for (var i = 0; i < users.groups.length; i++) {
        if (users.groups[i].user === name) {
          return i;
        }
      }
    }
    return -1;
  }

  //set active prices from bottom-up, IF NOT SET
  //FORMAT: price[#index][attribute][0]
  this.setActivePrices = function(price) {
    var originToDest = {};
    for (var i = price.length-1; i >= 0; i--) {
      if (!price[i].hasOwnProperty('active')) { //check for property
        var from = price[i]['from'][0];
        var to = price[i]['to'][0];
        if (originToDest.hasOwnProperty(from)) {  //check for redundancy of 'from'
          var dest = originToDest[from];
          if (dest.indexOf(to) >= 0) {  //check for destination exist, active to no
            price[i]['active'] = ['No'];
          } else {
            price[i]['active'] = ['Yes'];
          }
        } else {
          originToDest[from] = [to];
          price[i]['active'] = ['Yes'];
        }
      }
    }
  }

  //get ID of latest event
  //FORMAT: logData[type][#index][attribute][0]
  this.getMaxID = function(logData, eventTypes) {
    var currentMaxID = 0;
    for (var i = 0; i < eventTypes.length; i++) {
      var type = eventTypes[i];

      for (var j = 0; j < logData[type].length; j++) {
        var num = parseInt(logData[type][j]['ID'][0]);
        if (num > currentMaxID) {
           currentMaxID = num;
        }
      }
    }
    return currentMaxID;
  }

  //get Event in logData
  //FORMAT: logData[type][#index][attribute][0]
  this.getEvent = function(logData,eventTypes,uID) {
    for (var i = 0; i < eventTypes.length; i++) {
      var type = eventTypes[i];
      for (var j = 0; j < logData[type].length; j++) {
        if (logData[type][j]['ID'][0] === uID) {
          return logData[type][j];
        }
      }
    }

    return null;
  }

  //getEvent in a particular set of events 'array'
  //FORMAT: array[#index][attribute][0]
  this.getEvent = function(array,uID) {
    for (var j = 0; j < array.length; j++) {
      if (array[j]['ID'][0] === uID) {
        return array[j];
      }
    }

    return null;
  }

  //get Attribute in event
  //FORMAT: logData[type][#index][attribute][0]
  this.getAttribute = function(evt,attr) {
    return evt[attr][0];
  }

  //get all international cities
  //NOTE: 'New Zealand' IS included in local
  //FORMAT: prices[#index][attribute][0]
  this.getIntlCities = function(prices, local) {
    var result = [];
    for (var i = 0; i < prices.length; i++) {
      var to = prices[i]['to'][0];
      if (local.indexOf(to) < 0 && result.indexOf(to) < 0 ) {  //not local and not in result yet
        result.push(to);
      }

    }
    return result;
  }

  //remove cost updates that have an discontinued associated discontinue update
  //NOTE: this will modify cost array so, you must give a copy only, not the original
  this.removeDiscontinued = function (cost,discontinued) {
    var indexesToRemoveFromCost = [];

    //find
    for (var i = 0; i < discontinued.length; i++) {
      var id = discontinued[i]['ID'][0];
      var company = discontinued[i]['company'][0];
      var type = discontinued[i]['type'][0];
      var from = discontinued[i]['from'][0];
      var to = discontinued[i]['to'][0];

      for (var j = 0; j < cost.length; j++) {
        var id2 = cost[j]['ID'][0];
        var company2 = cost[j]['company'][0];
        var type2 = cost[j]['type'][0];
        var from2 = cost[j]['from'][0];
        var to2 = cost[j]['to'][0];
        if (company===company2 && type===type2 && from===from2 && to===to2 && id>id2) {
          indexesToRemoveFromCost.push(j);
        }
      }
    }

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

  //getPriceIntl - get price for International Mail
  //FORMAT: prices[#index][attribute][0]
  this.getPriceIntl = function(prices,from,to,scopePriority,weight,volume) {
    for (var i = prices.length -1; i >= 0; i--) {
      if ( (prices[i]['from'][0] === from || prices[i]['from'][0] === 'New Zealand') &&
      prices[i]['to'][0] === to &&
      prices[i]['priority'][0] === scopePriority) {
        return weight*prices[i]['weightcost'][0]+volume*prices[i]['volumecost'][0];
      }
    }
    return null;
  }

  //getPriceLoc - get Price for Local Mail
  //FORMAT: prices[#index][attribute][0]
  this.getPriceLoc = function(prices, scopePriority, weight, volume) {
    for (var i = prices.length -1; i >= 0; i--) {
      if (prices[i]['from'][0] === 'New Zealand' &&
      prices[i]['to'][0] === 'New Zealand' &&
      prices[i]['priority'][0] === scopePriority) {
        return weight*prices[i]['weightcost'][0]+volume*prices[i]['volumecost'][0];
      }
    }
    return null;
  }

  //log simulation data aka logData to location fileName e.g. sample.xml will write/overwrite sample.xml in root dir of site
  this.writeToLog = function(simulation, fileName, currentMaxID) {
    var xml = builder.buildObject({simulation});

    fs.writeFile(fileName, xml,  function(err) {
      if (err) {
        return console.error(err);
      }
    });
  }

  //find cost update which has same company,from,to and type, then return true
  //NOTE: this searches bottom-up
  this.hasCostUpdate = function(costs, company,from, to,type) {
    for (var i = costs.length-1; i >= 0 ; i--) {
      if (costs[i]['company'][0] === company &&
      costs[i]['from'][0] === from &&
      costs[i]['to'][0] === to &&
      costs[i]['type'][0] === type) {
        return true;
      }
    }
    return false;
  }

  //sets a price instance in the prices array to inactive if it matches the priceUpdate
  //NOTE: this searches bottom-up
  //NOTE: loop starts at prices.length-2 to skip the newly added price update
  this.setToInactive = function(prices, priceUpdate) {
    for (var i = prices.length-2; i >= 0; i--) {
      if (prices[i]['to'][0] === priceUpdate['to'][0] &&
      prices[i]['from'][0] === priceUpdate['from'][0] &&
      prices[i]['priority'][0] === priceUpdate['priority'][0]) {
        prices[i]['active'][0] = 'No';
        return prices[i]['ID'][0];
      }
    }
    //no previous matching price update
    return null;
  }

  //FORMAT: logData[type][#index][attribute][0]
  this.getFigures = function(logData,limit) {

    var figures = {};
    figures['revenue'] = 0;
    figures['expenditure'] = 0;
    figures['event'] = limit;
    figures['mail'] = {};
    figures['routes'] = {};

    for (var i = 0; i < logData['mail'].length && parseFloat(logData['mail'][i]['ID'][0]) <= limit; i++) {
      figures['revenue'] += parseFloat(logData['mail'][i]['price'][0]);
      figures['expenditure'] += parseFloat(logData['mail'][i]['cost'][0]);

      var mailKey = logData['mail'][i]['from'][0]+"-"+logData['mail'][i]['to'][0];
      if(figures['mail'].hasOwnProperty(mailKey)){
        figures['mail'][mailKey]['volume'] += parseFloat(logData['mail'][i]['volume'][0]);
        figures['mail'][mailKey]['weight'] += parseFloat(logData['mail'][i]['weight'][0]);
        figures['mail'][mailKey]['items']++;
      } else {
        figures['mail'][mailKey] = {'fromTo': mailKey};
        figures['mail'][mailKey]['volume'] = parseFloat(logData['mail'][i]['volume'][0]);
        figures['mail'][mailKey]['weight'] = parseFloat(logData['mail'][i]['weight'][0]);
        figures['mail'][mailKey]['items'] = 1;
      }

      var routesKey = logData['mail'][i]['from'][0]+"-"+logData['mail'][i]['to'][0]+" by "+logData['mail'][i]['priority'][0].split(" ")[1];
      if(figures['routes'].hasOwnProperty(routesKey)){
        figures['routes'][routesKey]['expenditure'] += parseFloat(logData['mail'][i]['cost'][0]);
        figures['routes'][routesKey]['revenue'] += parseFloat(logData['mail'][i]['price'][0]);
        figures['routes'][routesKey]['difference'] += (parseFloat(logData['mail'][i]['price'][0]) - parseFloat(logData['mail'][i]['cost'][0]));
        figures['routes'][routesKey]['duration'] += parseFloat(logData['mail'][i]['duration'][0]);
        figures['routes'][routesKey]['items']++;
      } else {
        figures['routes'][routesKey] = {'fromToPri': routesKey};
        figures['routes'][routesKey]['expenditure'] = parseFloat(logData['mail'][i]['cost'][0]);
        figures['routes'][routesKey]['revenue'] = parseFloat(logData['mail'][i]['price'][0]);
        figures['routes'][routesKey]['difference'] = (parseFloat(logData['mail'][i]['price'][0]) - parseFloat(logData['mail'][i]['cost'][0]));
        figures['routes'][routesKey]['duration'] = parseFloat(logData['mail'][i]['duration'][0]);
        figures['routes'][routesKey]['items'] = 1;
      }
    }

    for (var instance in figures['routes']) {
      figures['routes'][instance]['aveExpenditure'] = figures['routes'][instance]['expenditure']/figures['routes'][instance]['items'];
      figures['routes'][instance]['aveRevenue'] = figures['routes'][instance]['revenue']/figures['routes'][instance]['items'];
      figures['routes'][instance]['aveDuration'] = figures['routes'][instance]['duration']/figures['routes'][instance]['items'];
      figures['routes'][instance]['aveDifference'] = figures['routes'][instance]['difference']/figures['routes'][instance]['items'];
      if (figures['routes'][instance]['aveExpenditure'] > figures['routes'][instance]['aveRevenue']) {
        figures['routes'][instance]['critical'] = "Yes";
      } else {
        figures['routes'][instance]['critical'] = "No";
      }

    }

    return figures;
  }

}



module.exports = tools;
