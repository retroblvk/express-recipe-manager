const express = require('express');
const { Pool, Client } = require('pg');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const knex = require('knex');
const app = express();

const db = knex({
  client: 'pg',
  connection: {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'recipe_db',
    password: 'sophia100',
  },
});

app.use(express.json());
app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    key: process.env.KEY,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 60 * 60 * 24,
    },
  })
);

app.get('/login', (req, res) => {
  if ('user' in req.session) {
    db.select('*')
      .from('users')
      .where('email', req.session.user.email)
      .then((data) => {
        res.send(data);
      })
      .catch((err) => {
        res.send({ message: 'user not logged in' });
      });
  } else {
    res.send({ message: 'user not logged in' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.send({ message: 'logged out' });
});

app.post('/register', (req, res) => {
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    db.transaction((trx) => {
      trx
        .insert({
          hash: hash,
          email: req.body.email,
        })
        .into('login')
        .returning('email')
        .then((loginEmail) => {
          return db('users')
            .returning('*')
            .insert({
              email: loginEmail[0],
              joined: new Date(),
            })
            .then((user) => {
              res.json(user[0]);
            })
            .catch((err) => res.status(400).json('unable to register'));
        })
        .then(trx.commit)
        .catch((err) => {
          trx.rollback;
          res.status(400).json('unable to register');
        });
    });
  });
});

app.post('/login', (req, res) => {
  const { password, email } = req.body;
  db('users')
    .join('login', 'users.email', '=', 'login.email')
    .select('users.email', 'login.hash')
    .where('users.email', email)
    .then((data) => {
      bcrypt.compare(req.body.password, data[0].hash, function (err, result) {
        // result == true
        console.log(result);
        if (result) {
          req.session.user = { email: data[0].email };
          res.send({ email: data[0].email });
        } else {
          res.send({ err: 'Incorrect email, or password' });
        }
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

app.listen(3001, () => {
  console.log('App listening on port 3000');
});
