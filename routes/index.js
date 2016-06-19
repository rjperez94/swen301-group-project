'use strict';
var xml2js = require('xml2js');
var parseString = xml2js.parseString;
var builder = new xml2js.Builder();
var express = require('express');
var fs = require('fs');
var router = express.Router();

var routeFinder = require('../models/routeFinder.js');
var tools = new (require('../models/tools.js'));
var secure = new (require('../models/secure.js'));

var userPath = 'users';
var logPath = 'sample3.xml';
var currentMaxID = 0;
var eventTypes = ['cost','price','mail','timelimit','discontinue'];
var local = ['Auckland', 'Hamilton', 'Rotorua', 'Palmerston North', 'Wellington', 'Christchurch', 'Dunedin'];
var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var transportTypes = ['Land', 'Air', 'Sea'];

var users;
var logData;

//load user file
if(tools.getFileRealPath(userPath)) {
  fs.open(userPath, 'r+', function(err, fd) {
    if (err) {
      return console.error(err);
    }
    fs.readFile(userPath, function (err, data) {
      if (err) {
        return console.error(err);
      }

      users = JSON.parse(secure.decrypt(data.toString()));
      fs.close(fd, function(err){
        if (err){
          return console.log(err);
        }
      });
    });
  });
}

//load log file
if(tools.getFileRealPath(logPath)) {
  fs.open(logPath, 'r+', function(err, fd) {
    if (err) {
      return console.error(err);
    }

    fs.readFile(logPath, function (err, data) {
      if (err) {
        return console.error(err);
      }
      parseString(data.toString(), function (err, result) {
        logData = result['simulation'];
        //getMaxID
        currentMaxID = tools.getMaxID(logData,eventTypes);
        //active prices
        //NOTE: this only executes when no 'Active' attr has beem found in logData['price'] instances
        tools.setActivePrices(logData['price']);
        fs.close(fd, function(err){
          if (err){
            return console.log(err);
          }
        });
      });
    });

  });
}

// GET: /
router.get('/', function(req, res) {
  if(!req.session.user) { //check for login
    res.render('index/index', {
      title: 'KPSmart - Restricted Access'
    });
  } else {
      res.redirect('/main?ID='+currentMaxID);
  }
});

// GET: /main
router.get('/main', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var limit = currentMaxID;
    if(req.query.ID && req.query.ID <= limit){
      limit = req.query.ID;
    }
    res.render('index/main', {
      title: 'KPSmart - Home',
      username: req.session.user,
      figures: tools.getFigures(logData, limit)
    });
  }
});

// POST: /login
router.post('/login', function(req, res) {
  if (!req.session.user) { // Check if user logged in
    var i = tools.getIndex(users,req.body.username);
    if (i >=0) {
      if (users.groups[i].pass === req.body.password) {
        req.session.user = req.body.username;
        req.session.save();
        //console.log(req.session);
        res.redirect('/main?ID='+currentMaxID);
      } else {
        res.render('index/feedback', {
          title: 'KPSmart - Restricted Access',
          feedback: ['Password incorrect']
        });
      }
    } else {
      res.render('index/feedback', {
        title: 'KPSmart - Restricted Access',
        feedback: ['Username does not exist']
      });
    }
  } else {
      res.redirect('/main?ID='+currentMaxID);
  }
});

// GET: /logout
router.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

// POST: /signup
router.post('/signup', function(req, res) {
  var role = req.body.role;
  var pass = req.body.passwordinput;
  var rePass = req.body.retypepassword;
  var email = req.body.emailinput;

  //email regex
  var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

  var feedback = [];

  if (!re.test(email)) {
    feedback.push('Invalid email address');
    feedback.push('Nothing has been changed');
  } else if (users && tools.getIndex(users,role) >= 0) {
    feedback.push('Login for user group"'+role+'" already exist');
    feedback.push('Nothing has been changed');
  } else {
    var text = '{"groups":[';
    if (users) {
      for (var i = 0; i <users.groups.length; i++) {
        text+='{"user":"'+users.groups[i].user+'", "pass":"'+users.groups[i].pass+'", "email":"'+users.groups[i].email+'"},';
      }
    } else {
      users = {'groups':[]};
    }
    users['groups'].push({'user':role, 'pass':pass, 'email':email});
    text+='{"user":"'+role+'", "pass":"'+pass+'", "email":"'+email+'"}]}';

    feedback.push([['You can now log in as '+role+' and your recovery email is '+email]]);
    fs.writeFile(userPath, secure.encrypt(text),  function(err) {
       if (err) {
           return console.error(err);
       }
    });
  }

  res.render('index/feedback', {
    title: 'KPSmart - Restricted Access',
    username: req.session.user,
    feedback: feedback
  });
});

// GET: /edit login information
router.get('/edit', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var i = tools.getIndex(users, req.session.user);
    var email = users.groups[i].email;
    res.render('form/edit', {
      title: 'KPSmart - Edit Credentials',
      username: req.session.user,
      email: email
    });
  }
});

// POST: /edit_process
router.post('/edit_process', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var role = req.session.user;
    var currPass = req.body.currentpasswordinput;
    var newPass = req.body.passwordinput;
    var newRePass = req.body.retypepassword;
    var email = req.body.emailinput;
    //email regex
    var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

    var index = tools.getIndex(users,req.session.user);
    var feedback = [];
    if(currPass !==  users.groups[index].pass || !re.test(email)){
      if (currPass !==  users.groups[index].pass) {
        feedback.push(['Current password entered does not match with current password']);
      }
      if (!re.test(email)) {
        feedback.push('Invalid email address');
      }
      feedback.push('Nothing has been changed');
    } else {
      var text = '{"groups":[';
      if (users) {
        for (var i = 0; i <users.groups.length; i++) {
          if (i !== index) {
            text+='{"user":"'+users.groups[i].user+'", "pass":"'+users.groups[i].pass+'", "email":"'+users.groups[i].email+'"},';
          }
        }
      }
      if (newPass === '') {
        text+='{"user":"'+role+'", "pass":"'+currPass+'", "email":"'+email+'"}]}';
        users['groups'][index]['pass'] = currPass;
        users['groups'][index]['email'] = email;
      } else {
        text+='{"user":"'+role+'", "pass":"'+newPass+'", "email":"'+email+'"}]}';
        users['groups'][index]['pass'] = newPass;
        users['groups'][index]['email'] = email;
        feedback.push(['Password changed']);
      }

      fs.writeFile(userPath, secure.encrypt(text),  function(err) {
        if (err) {
          return console.error(err);
        }
      });
    }

    res.render('index/feedback', {
      title: 'KPSmart - Edit Credentials',
      username: req.session.user,
      feedback: feedback
    });
  }
});

// GET: /cost updates list
router.get('/cost-list', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    //make copy of costs
    var costs = [];
    for (var i = 0; i < logData['cost'].length; i++) {
      costs.push(logData['cost'][i]);
    }
    tools.removeDiscontinued(costs,logData['discontinue']);
    res.render('index/costs', {
      title: 'KPSmart - Cost List',
      username: req.session.user,
      costs: costs,
      headings: ['ID','company','to','from','type','weightcost','volumecost','maxWeight','maxVolume','duration','frequency','day']
    });
  }
});

// GET: /price updates list
router.get('/price-list', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    res.render('index/prices', {
      title: 'KPSmart - Price List',
      username: req.session.user,
      prices: logData['price'],
      headings: ['ID','to','from','priority','weightcost','volumecost','in-use']
    });
  }
});

//GET: /deliver
router.get('/deliver', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var localNZ = [];
    for (var i = 0; i < local.length; i++) {
      localNZ.push(local[i])
    }
    localNZ.push('New Zealand');
    var internationalCities = tools.getIntlCities(logData['price'], localNZ);

    res.render('form/mail', {
      title: 'KPSmart - Mail Delivery',
      username: req.session.user,
      priority: ['Standard', 'Air'],
      scope: ['Domestic','International'],
      localTo: local,
      intl: internationalCities
    });
  }
});

//POST: /mail
router.post('/mail', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var from = req.body.from;
    var scope = req.body.scope;
    var priority = req.body.priority;
    var volume = req.body.volume;
    var weight = req.body.weight;
    var to;

    if(scope === 'Domestic') {
      to = req.body.toLocal;
    } else if(scope === 'International') {
      to = req.body.toIntl;
    }

    var graph = new routeFinder(logData['cost'], logData['discontinue'], local);
    //FORMAT: pathCost['path'] OR pathCost['cost']
    var pathCost;
    if (priority ==='Air') {
      pathCost = graph.getPath(from, to, priority,weight,volume,true);
    } else {
      //FORMAT: noAir['path'] OR noAir['cost']
      var noAir = graph.getPath(from, to, priority,weight,volume,false);
      //console.log(noAir);
      if (noAir !== null) {
        pathCost = noAir;
      } else {
        var yesAir = graph.getPath(from, to, priority,weight,volume,true);
        //console.log(yesAir);
        pathCost = yesAir;
      }
    }

    if (pathCost !== null) {

      var feedback = [];
      var price = null;
      if (scope === 'International') {
        price=tools.getPriceIntl(logData['price'],from,to,scope+' '+priority,weight,volume);
      } else if(scope === 'Domestic') {
        price=tools.getPriceLoc(logData['price'],scope+' '+priority,weight,volume);
      }

      if (price !== null) {
        var dayIndex = new Date().getDay();
        logData['mail'].push({
          'ID':[currentMaxID+1],
          'day':days[dayIndex],
          'to':[to],
          'from':[from],
          'weight':[weight],
          'volume': [volume],
          'priority': [scope+' '+priority],
          'price': price,
          'cost': pathCost['cost']
        });
        //write to log file
        tools.writeToLog(logData,logPath, currentMaxID);

        feedback.push(['Price is $'+price]);
        feedback.push(['Path is '+pathCost['path']]);
        feedback.push(['Cost is $'+pathCost['cost']]);
        feedback.push(['Tranport firms involved: '+pathCost['transport']]);
        res.render('index/feedback', {
          title: 'KPSmart - Mail Delivery',
          username: req.session.user,
          feedback: feedback
        });
      } else {
        res.render('index/feedback', {
          title: 'KPSmart - Mail Delivery',
          username: req.session.user,
          feedback: ['Route is available but has NO associated price']
        });
      }
    } else {
      res.render('index/feedback', {
        title: 'KPSmart - Mail Delivery',
        username: req.session.user,
        feedback: ['Route not available']
      });
    }

  }
});

//GET: /close-rt
router.get('/close-rt', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    //make copy of costs
    var costs = [];
    for (var i = 0; i < logData['cost'].length; i++) {
      costs.push(logData['cost'][i]);
    }
    tools.removeDiscontinued(costs,logData['discontinue']);

    var company = [];
    var to = [];
    var from = [];
    for (var i = 0; i < costs.length; i++) {
      if(company.indexOf(costs[i]['company'][0]) < 0) {
        company.push(costs[i]['company'][0]);
      }
      if(to.indexOf(costs[i]['to'][0]) < 0) {
        to.push(costs[i]['to'][0]);
      }
      if(from.indexOf(costs[i]['from'][0]) < 0) {
        from.push(costs[i]['from'][0]);
      }
    }

    var instance = null;
    if (req.query.ID) {
      instance = tools.getEvent(costs,req.query.ID);
    }
    res.render('form/close-rt', {
      title: 'KPSmart - Close Route',
      username: req.session.user,
      type: transportTypes,
      company: company,
      to: to,
      from: from,
      instance: instance
    });
  }

});

//POST: /discontinue
router.post('/discontinue', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var company = req.body.company;
    var from = req.body.from;
    var to = req.body.to;
    var type = req.body.type;

    //make copy of costs
    var costs = [];
    for (var i = 0; i < logData['cost'].length; i++) {
      costs.push(logData['cost'][i]);
    }
    tools.removeDiscontinued(costs,logData['discontinue']);

    if(tools.hasCostUpdate(costs, company,from, to,type) === true) {
      logData['discontinue'].push({
        'ID':[currentMaxID+1],
        'company':[company],
        'to':[to],
        'from':[from],
        'type':type
      });
      //write to log file
      tools.writeToLog(logData,logPath, currentMaxID);
      res.render('index/feedback', {
        title: 'KPSmart - Close Route',
        username: req.session.user,
        feedback: ['Route from '+from+' to '+to+' of '+company+' by '+type+' has now been discontinued']
      });
    } else {
      res.render('index/feedback', {
        title: 'KPSmart - Close Route',
        username: req.session.user,
        feedback: ['Route not available']
      });
    }
  }
});

//GET: /price-up
router.get('/price-up', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var from = [];
    for (var i = 0; i < local.length; i++) {
      from.push(local[i]);
    }
    from.push('New Zealand');

    var instance = null;
    if (req.query.ID) {
      instance = tools.getEvent(logData['price'],req.query.ID);
    }
    res.render('form/price-up', {
      title: 'KPSmart - Price Update',
      username: req.session.user,
      priority: ['Standard', 'Air'],
      scope: ['Domestic', 'International'],
      froms: from,
      instance: instance
    });
  }

});

//POST: /price_process
router.post('/price_process', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var from = req.body.from;
    var to = req.body.to;
    var scope = req.body.scope;
    var priority = req.body.priority;
    var volumecost = req.body.volumecost;
    var weightcost = req.body.weightcost;

    if(scope === 'Domestic') {
      logData['price'].push({
        'ID':[currentMaxID+1],
        'to':['New Zealand'],
        'from':['New Zealand'],
        'priority': ['Domestic '+priority],
        'weightcost':[weightcost],
        'volumecost':[volumecost],
        'active':['Yes']
      });
    } else {
      logData['price'].push({
        'ID':[currentMaxID+1],
        'to':[to],
        'from':[from],
        'priority': [scope+' '+priority],
        'weightcost':[weightcost],
        'volumecost':[volumecost],
        'active':['Yes']
      });
    }

    var matchID = tools.setToInactive(logData['price'], logData['price'][ logData['price'].length-1 ]);
    //write to log file
    tools.writeToLog(logData,logPath, currentMaxID);

    var feedback = [['Price update successful']];
    if(matchID !== null) {
      feedback.push(['Price update with ID '+matchID+' has been replaced by this and is now inactive']);
    }
    res.render('index/feedback', {
      title: 'KPSmart - Price Update',
      username: req.session.user,
      feedback: feedback
    });
  }

});

//GET: /price-deactivate
router.get('/price-deactivate', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var feedback = [];
    var instance = null;
    if (req.query.ID) {
      instance = tools.getEvent(logData['price'],req.query.ID);
      if(instance !== null) {
        if(instance['active'][0] === 'Yes') {
          instance['active'][0] = 'No';
          //write to log file
          tools.writeToLog(logData,logPath, currentMaxID);

          feedback.push(['Price update with ID '+instance['ID'][0]+' has been deactivated and is now inactive']);
          feedback.push(['This price deactivation will be logged. But it will NOT create a new price update event']);
        } else {
          feedback.push(['Price update not in use']);
          feedback.push(['Nothing has changed']);
        }
      } else {
        feedback.push(['Event with ID is not a price update']);
      }
    } else {
      feedback.push(['No event selected']);
    }

    res.render('index/feedback', {
      title: 'KPSmart - Price Deactivate',
      username: req.session.user,
      feedback: feedback
    });
  }

});

//GET: /cost-up
router.get('/cost-up', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var instance = null;
    if (req.query.ID) {
      instance = tools.getEvent(logData['cost'],req.query.ID);
    }
    res.render('form/cost-up', {
      title: 'KPSmart - Cost Update',
      username: req.session.user,
      type: transportTypes,
      days: days,
      instance: instance
    });
  }

});

//POST: /cost_process
router.post('/cost_process', function(req, res) {
  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    var company = req.body.company;
    var to = req.body.to;
    var from = req.body.from;
    var type = req.body.type;
    var weightcost = req.body.weightcost;
    var volumecost = req.body.volumecost;
    var maxWeight = req.body.maxWeight;
    var maxVolume = req.body.maxVolume;
    var duration = req.body.duration;
    var frequency = req.body.frequency;
    var day = req.body.day;

    logData['cost'].push({
      'ID':[currentMaxID+1],
      'company':[company],
      'to':[to],
      'from':[from],
      'type': [type],
      'weightcost':[weightcost],
      'volumecost':[volumecost],
      'maxWeight':[maxWeight],
      'maxVolume':[maxVolume],
      'duration':[duration],
      'frequency':[frequency],
      'day':[day]
    });
    //write to log file
    tools.writeToLog(logData,logPath, currentMaxID);
    res.render('index/feedback', {
      title: 'KPSmart - Cost Update',
      username: req.session.user,
      feedback: ['Route from '+from+' to '+to+' of '+company+' by '+type+' has been updated/created']
    });
  }

});

//GET: /test
router.get('/test', function(req, res) {
  //NOTE: Test code here, click Test link in index.pug
  //test write to log
  // for (var i = 0; i < logData['mail'].length; i++) {
  //   //logData[type][#index][attribute][0]
  //   var from = logData['mail'][i]['from'][0];
  //   var scope = logData['mail'][i]['priority'][0].split(" ")[0];
  //   var priority = logData['mail'][i]['priority'][0].split(" ")[1];
  //   var volume = logData['mail'][i]['volume'][0];
  //   var weight = logData['mail'][i]['weight'][0];
  //   var to = logData['mail'][i]['to'][0];
  //
  //   var graph = new routeFinder(logData['cost'], logData['discontinue'], local);
  //   //FORMAT: pathCost['path'] OR pathCost['cost']
  //   var pathCost;
  //   if (priority ==='Air') {
  //     pathCost = graph.getPath(from, to, priority,weight,volume,true);
  //     console.log(pathCost);
  //   } else {
  //     //FORMAT: noAir['path'] OR noAir['cost']
  //     var noAir = graph.getPath(from, to, priority,weight,volume,false);
  //     if (noAir !== null) {
  //       pathCost = noAir;
  //     } else {
  //       var yesAir = graph.getPath(from, to, priority,weight,volume,true);
  //       pathCost = yesAir;
  //     }
  //   }
  //   var price = null;
  //   if (scope === 'International') {
  //     price=tools.getPriceIntl(logData['price'],from,to,scope+' '+priority,weight,volume);
  //   } else if(scope === 'Domestic') {
  //     price=tools.getPriceLoc(logData['price'],scope+' '+priority,weight,volume);
  //   }
  //
  //   console.log(logData['mail'][i]['ID']+" "+from+" "+to+" "+priority+" "+scope);
  //   logData['mail'][i]['price'] = [price];
  //   logData['mail'][i]['cost'] = [pathCost['cost']];
  //
  // }
  //
  // var xml = builder.buildObject({logData});
  // fs.writeFile('sample3.xml', xml,  function(err) {
  //   if (err) {
  //     return console.error(err);
  //   }
  // });

  console.log(tools.getFigures(logData, currentMaxID));
  //var xml = builder.buildObject({'simulation':{logData}});
  //console.log(xml);
  res.redirect('/');
});

module.exports = router;
