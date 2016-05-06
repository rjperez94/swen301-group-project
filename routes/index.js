'use strict';
var xml2js = require('xml2js');
var parseString = xml2js.parseString;
var builder = new xml2js.Builder();
var express = require('express');
var fs = require('fs');
var router = express.Router();

var routeFinder = require('../models/routeFinder.js');
var tools = new (require('../models/tools.js'));

var userPath = 'users.json';
var logPath = 'sample2.xml';
var currentMaxID = 0;
var eventTypes = ['cost','price','mail','timelimit','discontinue'];
var local = ['Auckland', 'Hamilton', 'Rotorua', 'Palmerston North', 'Wellington', 'Christchurch', 'Dunedin'];
var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

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

      users = JSON.parse(data.toString());
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
    res.redirect('/main');
  }
});

// GET: /main
router.get('/main', function(req, res) {
  //console.log(req.session);

  if(!req.session.user) { //check for login
    res.redirect('/');
  } else {
    res.render('index/main', {
      title: 'KPSmart - Home',
      username: req.session.user
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
        res.redirect('/main');
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
    res.redirect('/main');
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

  if (users) {
    var i = tools.getIndex(users,role);
    if (i >= 0) {
      feedback.push('Login for user group"'+role+'" already exist');
      feedback.push('Nothing has been changed');
    }
  } else if (pass !== rePass || !re.test(email)) {
    if (newPass !== newRePass) {
      feedback.push('New password entered does not match with re-typed password');
    }
    if (!re.test(email)) {
      feedback.push('Invalid email address');
    }
    feedback.push('Nothing has been changed');
  } else {
    var text = '{"groups":[';
    if (users) {
      for (var i = 0; i <users.groups.length; i++) {
        text+='{"user":"'+users.groups[i].user+'", "pass":"'+users.groups[i].pass+'", "email":"'+users.groups[i].email+'"},';
      }
    }
    text+='{"user":"'+role+'", "pass":"'+pass+'", "email":"'+email+'"}]}';
    fs.writeFile('users.json', text,  function(err) {
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
    var i = getIndex(req.session.user);
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

    var index = getIndex(req.session.user);
    var feedback = [];

    if (currPass !==  users.groups[index].pass || newPass !== newRePass || !re.test(email)) {
      if (currPass !==  users.groups[index].pass) {
        feedback.push(['Current password entered does not match with current password']);
      }
      if (newPass !== newRePass) {
        feedback.push(['New password entered does not match with re-typed password']);
      }
      if (!re.test(email)) {
        feedback.push(['Invalid email address']);
      }
      feedback.push(['Nothing has been changed']);
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
      } else {
        text+='{"user":"'+role+'", "pass":"'+newPass+'", "email":"'+email+'"}]}';
        feedback.push(['Password changed']);
      }

      fs.writeFile('users.json', text,  function(err) {
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

// GET: /edit login information
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
      scope: ['Local','International'],
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

    if(scope === 'Local') {
      scope = 'Domestic';
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
      if (noAir !== null) {
        pathCost = noAir;
      } else {
        var yesAir = graph.getPath(from, to, priority,weight,volume,true);
        pathCost = yesAir;
      }
    }

    if (pathCost !== null) {
      var dayIndex = new Date().getDay();
      logData['mail'].push({'ID':[currentMaxID+1], 'day':days[dayIndex], 'to':[to], 'from':[from], 'weight':[weight], 'volume': [volume], 'priority': [scope+' '+priority]});
      //write to log file
      tools.writeToLog(logData,logPath);

      var feedback = [];
      if (scope === 'International') {
        feedback.push(['Price is $'+tools.getPriceIntl(logData['price'],from,to,scope+' '+priority,weight,volume)]);
      } else if(scope === 'Domestic') {
        feedback.push(['Price is $'+tools.getPriceLoc(logData['price'],scope+' '+priority,weight,volume)]);
      }
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
        feedback: ['Route not available']
      });
    }

  }
});

//GET: /close-rt
router.get('/close-rt', function(req, res) {
  //console.log(req.headers.referer.split('/'));
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
      type: ['Land', 'Air', 'Sea'],
      company: company,
      to: to,
      from: from,
      instance: instance
    });
  }

});

//GET: /discontinue
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
      logData['discontinue'].push({'ID':[currentMaxID+1], 'company':[company], 'to':[to], 'from':[from], 'type':type});
      //write to log file
      tools.writeToLog(logData,logPath);
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

//GET: /test
router.get('/test', function(req, res) {
  //NOTE: Test code here, click Test link in index.pug
  //test write to log
  var xml = builder.buildObject({'simulation':{logData}});
  console.log(xml);
  res.redirect('/');
});

module.exports = router;
