/**
 * API Controllers
 */

'use strict';

var settings = require('../config/env/default');

// endpoint controllers
var elections = require('./api/elections');
var polls = require('./api/polls');
var questions = require('./api/questions');
var ballots = require('./api/ballots');
var users = require('./api/users');
var groups = require('./api/groups');

var api = { // an object to contain all response handlers
  elections: elections,
  polls: polls,
  questions: questions,
  ballots: ballots,
  users: users,
  groups: groups
};


module.exports = api;