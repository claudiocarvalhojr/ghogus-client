if (process.env.NODE_ENV !== 'production') {
  require('dotenv-safe').config()
}
var createError = require('http-errors');
var express = require('express');
var router = express.Router()
var path = require('path');
var cookieParser = require('cookie-parser');
// var cookie = require('cookie');
var logger = require('morgan');

var dbConfig = require('./db');
var mongoose = require('mongoose');
var field = mongoose.Types.ObjectId();
var useUnifiedTopology = { useUnifiedTopology: true, useNewUrlParser: true }
mongoose.connect(dbConfig.url, useUnifiedTopology);

var app = express();

const APP_TITLE = process.env.APP_TITLE

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuring Passport
var passport = require('passport');
var session = require('express-session');
app.use(session({
  secret: process.env.APP_SECRET,
  cookie: { maxAge: 1000 * 60 * 60 },
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

var flash = require('connect-flash');
app.use(flash());

// Initialize Passport
var initPassport = require('./passport/init');
initPassport(passport);

var index = require('./routes/index')(passport);
var products = require('./routes/products')(passport);
var cart = require('./routes/cart')(passport);
var checkout = require('./routes/checkout')(passport);
// var register = require('./routes/_register')(passport);
// var contact = require('./routes/_contact');
app.use('/', index);
app.use('/', products)
app.use('/', cart)
app.use('/', checkout)
// app.use('/', register)
// app.use('/', contact)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  if (req.isAuthenticated()) {
    res.render('index', {
      page: './templates/structure/not_found',
      menu: 'full',
      title: APP_TITLE
    });
  } else {
    res.render('index', {
      page: './templates/structure/not_found',
      menu: 'small',
      title: APP_TITLE
    });
  }
});

module.exports = app

