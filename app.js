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

app.get('/', (req, res) => {
  db.select('*')
    .from('users')
    .then((data) => {
      res.send(data);
    });
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
        .catch(trx.rollback);
    });
  });
});

app.listen(3001, () => {
  console.log('App listening on port 3000');
});
