var fs = require('fs');

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
  this.getEvent = function(eventTypes,uID) {
    for (var i = 0; i < eventTypes.length; i++) {
      var type = eventTypes[i];
      for (var j = 0; j < logData[type].length; j++) {
        if (logData[type][j]['ID'][0] === uID.toString()) {
          return logData[type][j];
        }
      }
    }

    return null;
  }

  //get Attribute in event
  //FORMAT: logData[type][#index][attribute][0]
  this.getAttribute = function(evt,attr) {
    return evt[attr][0];
  }

  //get Company name of Firms in Path
  //FORMAT: logData[type][#index][attribute][0]
  this.getCompany = function(firms) {
    var result = [];
    for (var i = 0; i < firms.length; i++) {
      result.push(firms[i]['company']);
    }
    return result;
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

  //getPrice
  //FORMAT: prices[#index][attribute][0]
  this.getPrice = function(prices,from,to,scopePriority,weight,volume) {
    console.log(scopePriority);
    for (var i = prices.length -1; i >= 0; i--) {
      if (prices[i]['from'] === from &&
      prices[i]['to'] === to &&
      prices[i]['priority'] === scopePriority) {
        return weight*prices[i]['weightcost']+volume*prices[i]['volumecost'];
      }
    }
    return null;
  }

}

module.exports = tools;
