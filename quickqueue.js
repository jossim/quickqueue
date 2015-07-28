var async = require('async'),
    amqp = require('amqplib'),
    channel,
    exName;

// Creates an AMQP exchange & 3 queues & binds the queues to the exchange.
// The exchange & non-test queues are all durable.
//
// The exchange is a topic exchange called 'sf-message-broker'. The three
// queues' routing keys are the same as their names: 'from_sales_force',
// 'to_sales_force', 'test_queue'.
//
// Returns a promise which contains a hash of default publishing settings that
// can be used if desired.
var initialize = function(url, config) {

  var connection = amqp.connect(url);

  var promise = new Promise(function(resolve, reject) {

    connection.then(function(conn) {
      channel = conn.createConfirmChannel();

      channel.then(function(ch) {

        exName = config.exchange.name;
        var exType = config.exchange.type;
        var exchange = ch.assertExchange(exName, exType, config.options);

        async.map(config.queues, function(item, cb) {
          var queue = exchange.then(function(ex) {
            return ch.assertQueue(item.name, config.options);
          });

          queue.then(function(q) {
            console.log('Created ' + item.name + ' queue.');
            ch.bindQueue(item.name, config.exchange.name, item.routingKey).
            then(function() {
              console.log('Bound to exchange.');
              cb(null, item);
            });
          });
        }, function() {
          resolve(channel);
        });
      });
    });

  });

  return promise;
}

// Publishes messages to an exchange with a routing key.
//
// Accepts:
//
// options
// 	A hash of exchange publishing options.
// routing_key
// 	The routing key as a string.
// messages
// 	An array of messages to publish.
// callback
// 	The function to be called once an attempt has been made to publish the
// 	messages
var enqueue = function(options, routing_key, messages, callback) {
  var buffers = [];
  var allPublished = true;

  for(var i = 0; i < messages.length; i++) {
    buffers.push(new Buffer(messages[i]));
  }

  async.map(buffers, function(item, cb) {
    channel.then(function(ch) {
      ch.publish(exName, routing_key, item, options,
      function(err, ok) {
        if(err !== null) {
          allPublished = false;
          console.log('Message not published');
        }
        else {
          console.log('Message published');
        }
        cb(null, item);
      })
    });
  }, callback(allPublished));

}

// Sets up a consumer to consume messages from a given queue.
//
// Accepts:
//
// queue
//  A string that is the name of a queue.
// options
//  A hash of options for the consumer
// callback
//  A callback that is invoked when a message is received. The callback is
//  passed the message & the channel. If the consumer has been cancelled, it is
//  passed null instead of the message. The callback is responsible for ack'ing
//  or noAck'ing the message.
var dequeue = function(options, queue, callback) {
  channel.then(function(ch) {
    ch.consume(queue, function(msg) { callback(msg, ch) }, options);
  });
}

module.exports.initialize = initialize;
module.exports.enqueue = enqueue;
module.exports.dequeue = dequeue;
