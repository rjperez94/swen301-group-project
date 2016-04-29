'use strict';
var express = require('express');
var session = require('express-session');
var fs = require("fs");
var router = express.Router();

var users;

//check if file exist
function getFileRealPath(path){
    try {
      return fs.realpathSync(path);
    } catch(e){
      return false;
    }
}

//check username
function getIndex(name){
  if (users) {
    for (var i = 0; users.groups.length; i++) {
      if (users.groups[i].user === name) {
        return i;
      }
    }
  }
  return -1;
}

//check pass
function getPassword(i){
  return users.groups[i].pass;
}


//router.use(express.cookieParser());
router.use(session({
  secret: '1234567890QWERTY',
  resave: false,
  saveUninitialized: true,
}));

if(getFileRealPath('users.json')) {
  fs.open('users.json', 'rs+', function(err, fd) {
     if (err) {
         return console.error(err);
     } else {
       fs.readFile('users.json', function (err, data) {
        if (err) {
           return console.error(err);
        }
        users = JSON.parse(data.toString());
        fs.close(fd, function(err){
          if (err){
             console.log(err);
          }
          console.log("File closed successfully.");
       });
      });
     }
  });
};

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
    if (!req.session.user) { // Check if user logged in
        var name = req.body.usernameinput;
        var pass = req.body.passwordinput;
        var i = getIndex(name);
        if (i >=0) {
          if (users[i].groups.pass === pass) {
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

  if (users) {
    for (var i = 0; i <users.groups.length; i++) {
      if (users.groups[i].user === role) {
        res.render('index/index', {
          title: 'KPSmart - Restricted Access'
        });
      }
    }
  }

  if (pass !== rePass || !re.test(email)) {
    res.render('index/index', {
      title: 'KPSmart - Restricted Access'
    });
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
});

module.exports = router;
