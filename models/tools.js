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

}

module.exports = tools;
