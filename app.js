if (process.env.NODE_ENV !== 'production') {
  require('dotenv-safe').config()
}
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var dbConfig = require('./db');
var mongoose = require('mongoose');
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
  // store: new MongoStore({
  //   db: global.db,
  //   ttl: 30 * 60 // = 30 minutos de sessão
  // }),
  secret: process.env.APP_SECRET,
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

var indexRouter = require('./routes/index')(passport);
app.use('/', indexRouter);

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
  res.render('error', {
    title: APP_TITLE
  });
});

module.exports = app

