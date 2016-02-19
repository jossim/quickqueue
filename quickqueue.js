'use strict';

const Async = require('async');
const Amqp = require('amqplib');

let channel;
let exName;

// Creates an AMQP exchange & 3 queues & binds the queues to the exchange.
// The exchange & non-test queues are all durable.
//
// The exchange is a topic exchange called 'sf-message-broker'. The three
// queues' routing keys are the same as their names: 'from_sales_force',
// 'to_sales_force', 'test_queue'.
//
// Returns a promise which contains a hash of default publishing settings that
// can be used if desired.
const initialize = function (url, config) {

    const connection = Amqp.connect(url);

    const promise = new Promise((resolve, reject) => {

        connection.then((conn) => {

            channel = conn.createConfirmChannel();

            channel.then((ch) => {

                exName = config.exchange.name;
                const exType = config.exchange.type;
                const exchange = ch.assertExchange(exName,
                                                    exType,
                                                    config.options);

                Async.map(config.queues, (item, cb) => {

                    const queue = exchange.then((ex) => {

                        return ch.assertQueue(item.name, config.options);
                    });

                    queue.then((q) => {

                        console.log('Created ' + item.name + ' queue.');

                        ch.bindQueue(item.name,
                            config.exchange.name,
                            item.routingKey).then(() => {

                                console.log('Bound to exchange.');
                                cb(null, item);
                            });
                    });
                }, () => {

                    resolve(channel);
                });
            });
        });
    });

    return promise;
};

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
const enqueue = function (options, routing_key, messages, callback) {

    const buffers = [];
    let allPublished = true;

    for (let i = 0; i < messages.length; ++i) {
        buffers.push(new Buffer(messages[i]));
    }

    Async.map(buffers, (item, cb) => {

        channel.then((ch) => {

            ch.publish(exName, routing_key, item, options, (err, ok) => {

                if (err !== null) {
                    allPublished = false;
                    console.log('Message not published');
                }
                else {
                    console.log('Message published');
                }

                cb(null, item);
            });
        });
    }, callback(allPublished));
};

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
const dequeue = function (options, queue, callback) {

    channel.then((ch) => {

        ch.consume(queue, (msg) => {

            callback(msg, ch);
        }, options);
    });
};

module.exports.initialize = initialize;
module.exports.enqueue = enqueue;
module.exports.dequeue = dequeue;
