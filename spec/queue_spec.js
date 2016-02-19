'use strict';

const Lab = require('lab');

const Code = require('code');

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const before = lab.before;

var quickqueue = require('../quickqueue.js'),
    assert = require('assert'),
    async = require('async');

var config = {
  options: {
    durable: false,
    mandatory: false,
    persistent: false,
    deliveryMode: 1,
  },
  exchange: {
    name: 'test',
    type: 'topic'
  },
  queues: [
    { name: 'test_queue', routingKey: 'test_queue' }
  ]
};

var amqpUrl = 'amqp://' + process.env.AMQP_PORT_5672_TCP_ADDR;
var quickChannel;

describe('Queue', function() {

  before(function(done) {

    q = quickqueue.initialize(amqpUrl, config);

    q.then(function(channel) {
      quickChannel = channel;
      done();
    });
  });

  describe('Enqueuing', function() {

    it('should queue a message', function(done) {

      var q, msg;
      var message = 'test 1';

      q = quickChannel.purgeQueue('test_queue');
      q.then(function() {
        quickqueue.enqueue({}, 'test_queue', [message], function() {

          var test = function() {
            msg = quickChannel.get('test_queue');

            msg.then(function(value) {
              assert.strictEqual(message, value.content.toString());
              done();
            });
          }
          setTimeout(test, 0);
        });
      });

    });

    it('should report if all messages have been queued', function(done) {
      var messages = ['test 2', 'test 3'];
      var all = false;

      // Purge queue & queue messages.
      q = quickChannel.purgeQueue('test_queue');

      q.then(function() {
        quickqueue.enqueue({}, 'test_queue', messages, function(allPublished) {
          all = allPublished;
          assert.strictEqual(true, all);
          done();
        });
      });
    });

  });

  describe('Dequeuing', function() {
    it('should get messages off a queue', function(done) {
      var message = ['test 4'];

      q = quickChannel.purgeQueue('test_queue');

      q.then(function() {
        quickqueue.enqueue({}, 'test_queue', message, function() {});

        quickqueue.dequeue({consumerTag: 'dequeueTest'}, 'test_queue', function(msg) {
          quickChannel.ack(msg);
          assert.strictEqual(message[0], msg.content.toString());
          done();
        });
      });
    });

  });

});
