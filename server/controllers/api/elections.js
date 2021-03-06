/**
 * Elections API Controller
 */

'use strict'

// Utilities
var _ = require('lodash');
var Promise = require('bluebird');
var uuid = require('uuid');

// DB models
var Election = require('../../database/models/election');
var User = require('../../database/models/user');
var Poll = require('../../database/models/poll');
var db = require('../../config/database');
var Mailer = require('../mailer');

Promise.promisifyAll(_);

var elections = {

  _checkForElection: function(id, req, res) {
    var election = new Election({id: id});
    return election.fetch()
      .then(function(election) {
        if ( election ) {
          return election;
        } else {
          res.status(404);
          req.send('Election object not found');
        }
      });
  },

  // list elections ( GET /elections )
  list: function(req, res) {
    var election = new Election;
    election.fetchAll({
      withRelated: ['poll']
    })
    .then(function(collection){
      res.send(collection.toJSON());
    });
  },

  ownerList: function(userId, req, res) {
    Election.where({owner_id: userId}).fetchAll()
    .then(function(collection){
      res.send(collection.toJSON());
    });
  },

  // create a new election entry ( POST /elections/create )
  create: function(req, res) {
    console.log(req.user);
    if ( req.body.election ) {
      User.forge({id: req.user.id}).fetch()
      .then(function(user){
        var data = req.body.election;
        var election = new Election({
          id: uuid.v4(),
          name: data.name,
          description: data.description || 'no description',
          start: data.start_date,
          end: data.end_date,
          timed: data.is_timed,
          privacy_strategy: data.privacy_strategy,
          randomize_answer_order: data.randomize_questions,
          two_factor_auth: data.allow_2_auth,
          force_two_factor_auth: data.force_2_auth,
          public_key: user.get('public_key'),
          owner_id: req.user.id
        }).save({},{method: 'insert'})
        .then(function(model){
          res.status(201);
          res.send(model.toJSON());
        }).error(function(error){
          res.status(500);
          console.error(error);
          res.end();
        });
      });
    } else {
      res.status(400);
      res.end('Bad request');
    }
  },

  // election request method for administration ( GET /elections/update/:id )
  adminGetById: function(id, req, res) {
    var election = new Election({id: id});
    election.fetch()
      .then(function(election){
        if ( election ) {
          res.send(election.toJSON());
        } else {
          res.staus = 404;
          res.send();
        }
      });
  },

  // election update method for administration ( POST /elections/update/:id )
  updateById: function(id, req, res) {
    var data = req.body;
    var election = new Election({id: id});
    election.fetch()
      .then(function(election){
        if ( election ) {
          if (election.get('accepting_votes') || election.get('locked')){
            res.status(401).send('You cannot edit an election once polls are open.');
          } else {
            _(data).forEach(function(value, property){
              // check to make sure we aren't allowing admins to change important stuff
              if (  property !== 'id'
                    && property !== 'owner_id'
                    && property !== 'created_at'
                    && property !== 'updated_at'
                    && property !== 'url_handle' // url is related to election_id
                    && property !== 'public_key'
                    && property !== 'results' // !!!! todo: more robust checking for rewrite fraud via API
                  ) {
                      election.set(property, value);
                  }
            });
            election.save().then(function(election){
              res.send(election.toJSON());
            });
          }
        } else {
          res.status(404);
          res.end('Election object not found');
        }
      });
  },

  // currently in use by endpoint - see future version below, requires front-end refactor
  voterGetById: function(id, req, res) {
    // select poll where election id is this election, and group id is one of user's groups
    db.knex('elections')
      .join('polls', 'polls.election_id', '=', 'elections.id')
      .join('groups', 'polls.group_id', '=', 'groups.id')
      .join('groups_users', 'groups.id', '=', 'groups_users.group_id')
      .join('users', 'groups_users.user_id', '=', 'users.id')
      .select('polls.id')
      .then(function(polls){
        var pollIds = _.map(polls, function(poll){
          return poll.id;
        });
        Poll.query(function(qb){
          qb.whereIn('id', pollIds).andWhere('election_id','=',id);
        }).fetchAll({withRelated: ['question']})
        .then(function(polls){
          Election.forge({id: id}).fetch()
          .then(function(election){
            election = election.toJSON();
            election.poll = polls.toJSON();
            res.send(election);
          });
        });
      });
  },

  // election request method for voters ( GET /elections/vote/:id )
  __voterGetById: function(id, req, res) { // potentially useful in future iterations, not currently in use
    var election = new Election({id: id});
    election.fetch({
      withRelated: ['poll'],
      columns: [
        'id',
        'name',
        'description',
        'start',
        'end',
        'accepting_votes',
        'url_handle',
        'randomize_answer_order',
        'results'
      ]
    })
    .then(function(election){
      if ( election ) {
        election.related('poll').load(['question'])
          .then(function(){
            res.send(election.toJSON());
          });
      } else {
        res.status(404);
        res.end('Election object not found');
      }
    });
  },

  // begin vote tabulation - admin only ( POST /elections/results/:id )
  tabulate: function(id, req, res) {
    var election = new Election({id: req.params.id});
    election.fetch()
      .then(function(election) {
        if ( election && election.get('owner_id') === req.user.id) {
          election.set({accepting_votes: false, locked: true}).save()
          .then(function(election){
            election.tabulate()
              .then(function(election){
                election.save().then(function(election){
                  res.json(election.get('results'));
                });
              });
          });
        } else {
          res.status(400);
          res.end('Error');
        }
      });
  },

  // view vote results - accessible to all users ( GET /elections/results:id )
  getResultsById: function(id, req, res) {
    this._checkForElection(id, req, res)
      .then(function(election){
        res.send(election);
      });
  },

  openForVoting: function(req, res){
    Election.forge({id: req.params.id}).fetch({withRelated: ['poll.group.user']})
    .then(function(election){
      if (election.get('owner_id') !== req.user.id){
        res.status(401).send('Only the owner may open an election.');
      } else if (election.get('locked')) {
        res.status(401).send('This election has been locked.');
      } else{
          election.set('accepting_votes', true).save()
          .then(function(election){
            res.send(election.toJSON({shallow: true}));
            election.relations.poll.forEach(function(poll){
              poll.relations.group.relations.user.forEach(function(user){
                Mailer.inviteToVote(user, election);
              });//user.foreach
            });//election/relations/poll/foreach
          });//election-save
        }//else
    });//fetch election
  }


};

module.exports = elections;
