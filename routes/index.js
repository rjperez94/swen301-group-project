'use strict';
var express = require('express');
var session = require('express-session');
var fs = require("fs");
var router = express.Router();

var users;

//router.use(express.cookieParser());
router.use(session({
  secret: '1234567890QWERTY',
  resave: false,
  saveUninitialized: true,
}));

fs.open('users.txt', 'rs+', function(err, fd) {
   if (err) {
       return console.error(err);
   } else {
     fs.readFile('users.txt', function (err, data) {
      if (err) {
         return console.error(err);
      }
      users = JSON.parse(data.toString());
    });
   }
});

//var data = fs.readFileSync('users.txt');
//var users = data.toSring();

// GET: /
router.get('/', function(req, res) {
  if(!req.session.user) {
    res.render('index/index', {
      title: 'KPSmart - Restricted Access'
    });
  } else {
    res.render('index/main', {
      title: 'KPSmart - Home'
    });
  }
});

router.post('/login', function(req, res) {
    if (!sess.user) { // Check if user logged in
        var name = req.body.usernameinput;
        var pass = req.body.passwordinput;
        if (name === 'Manager' && users[0].pass === pass || name === 'Clerk' && users[1].pass === pass) {
          req.session.user = name;
          res.render('index/main', {
            title: 'KPSmart - Home'
          });
        } else {
          res.render('index/index', {
            title: 'KPSmart - Restricted Access'
          });
        }
    } else {
      res.render('index/main', {
        title: 'KPSmart - Home'
      });
    }
});

router.post('/signup', function(req, res) {
  var role = req.body.role;
  var pass = req.body.passwordinput;
  var rePass = req.body.retypepassword;
  var email = req.body.emailinput;
  //email regex
  var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

  if (users[0].user === role || users[1].user === role || pass !== rePass || !re.test(email)) {
    res.render('index/index', {
      title: 'KPSmart - Restricted Access'
    });
  } else {

  }
});

module.exports = router;
