'use strict';

const Async = require('async');
const Amqp = require('amqplib');
const EventEmitter = require('events');
const Util = require('util');


const QuickQueue = function () {

    this.channel;
    this.exName;
};
Util.inherits(QuickQueue, EventEmitter);


/**
* Initialize an AMQP setup
*
* @param {string} uri           The URI of the AMQP server
*
* @param {hash} config        The configuration object. Must include options,
* exchange, & queues. All queues in the queues array are created, if they don't
* already exist. The exchange is created & all the queues are bound to it.
*
* const config = options: {
*     // These options are applied to the exchange & queues as applicable.
*     durable: true,
*     persistent: false,
*     ...
*   },
*   exchange: { // All of the queues will be bound to this exchange.
*       name: 'theExchangeName',
*       type: 'topic'
*   },
*   queues: [
*       { name: 'queue1', routingKey: 'rainbows' },
*       { name: 'queue2', routingKey: 'butterflies' },
*       ...
*   ]
* }
*
* @returns {promise} promise    The promise resolves with the channel created or
* rejects with an error message.
*/
QuickQueue.prototype.initialize = function (uri, config) {

    const connection = Amqp.connect(uri);

    const promise = new Promise((resolve, reject) => {

        connection.catch((err) => {

            console.error(err);
            reject(err);
        });

        connection.then((conn) => {

            this.channel = conn.createConfirmChannel();

            this.channel.then((ch) => {

                this.exName = config.exchange.name;
                const exType = config.exchange.type;
                const exchange = ch.assertExchange(this.exName,
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
                            }).catch((error) => {

                                console.error(error);
                                reject(error);
                            });
                    });

                    queue.catch((error) => {

                        console.error(error);
                        reject(error);
                    });
                }, () => {

                    resolve(this.channel);
                });
            });
        });
    });

    return promise;
};


/**
* Publish messsages to an exchange with a routing key
*
* @param {hash} options         A hash of exchange publising options
*
* @param {string} routing_key   The routing key as a string
*
* @param {array} messages       An array of messages to be published
*
* @param {function} callback    The function called once a publishing attempt is
* made on every message. The function is passed a boolean which is false if a
* message failed to publish.
*
* @param {hash} eventNames      (optional) A hash of events that will be
* emitted. Expects keys & values for any or all of the following 3 events:
* published, notPublished, & completed. Defaults to 'published', 'error',
* & 'allPublished'. The completed event is emitted if all the messages have
* successfully been published. The published event returns the message that was
* published, the notPublished event returns the error & the message that was not
* published.
*/
QuickQueue.prototype.enqueue = function (options, routing_key, messages, callback, eventNames) {

    const buffers = [];
    let allPublished = true;

    let published = 'published';
    let notPublished = 'error';
    let completed = 'allPublished';

    if (typeof eventNames === 'object') {
        if (eventNames.published) {
            published = eventNames.published;
        }
        if (eventNames.notPublished) {
            notPublished = eventNames.notPublished;
        }
        if (eventNames.completed) {
            completed = eventNames.completed;
        }
    }

    for (let i = 0; i < messages.length; ++i) {
        buffers.push(new Buffer(messages[i]));
    }

    Async.map(buffers, (item, cb) => {

        this.channel.then((ch) => {

            ch.publish(this.exName, routing_key, item, options, (err, ok) => {

                if (err !== null) {
                    this.emit(notPublished, err, item);
                    console.error('Message not published:', err);
                    allPublished = false;
                }
                else {
                    this.emit(published, item);
                    console.log('Message published');
                }

                cb(null, item);
            });
        });
    }, () => {

        if (allPublished) {
            this.emit(completed);
        }
        callback(allPublished);
    });
};


/**
* Setup a consumer to consume messages from a given queue
*
* @param {string} queue         The name of the queue to consume
*
* @param {hash} options         A hash of amqlib options used to setup the
* consumer
*
* @param {function} callback    The callback is invoked when a message is
* received. The callback is passed the message & amqplib channel. If the
* consumer has been cancelled, it is passed null instead of the message. The
* callback is responsible for ack'ing or noAck'ing the message.
*/
QuickQueue.prototype.dequeue = function (options, queue, callback, eventName) {

    const consumerEvent = eventName || 'dequeue';

    this.channel.then((ch) => {

        ch.consume(queue, (msg) => {

            this.emit(consumerEvent, msg, ch);
            callback(msg, ch);
        }, options);
    });
};

const exportedQueue = new QuickQueue();
module.exports = exportedQueue;
