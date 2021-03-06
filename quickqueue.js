'use strict';

const Async = require('async');
const Amqp = require('amqplib');
const EventEmitter = require('events');
const Util = require('util');


const internals = {
    messages: {},
    channel: null,
    /**
    * Add a message to the messages hash if it's currently not included
    *
    * @param {object} msg   The message to queue
    */
    pushMessage: function (msg) {

        const deliveryTag = msg.fields.deliveryTag;

        if (!this.messages[deliveryTag]) {
            this.messages[deliveryTag] = msg;
        }
    },
    /**
    * Check if a message has been queued or not
    *
    * @param {object} msg   The message that will be checked
    */
    isQueued: function (msg) {

        if (this.messages[msg.fields.deliveryTag]) {
            return true;
        }

        return false;
    }
};


const QuickQueue = function () {

    this.channel;
    this.exName;
};
Util.inherits(QuickQueue, EventEmitter);


QuickQueue.prototype.getMessages = function () {

    return internals.messages;
};


/**
* Initialize an AMQP setup
*
* @param {string} uri           The URI of the AMQP server
*
* @param {hash} config          The configuration object. Must include options,
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

                internals.channel = ch;
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
* Acknowledge a message
*
* @param {object} msg   The message to acknowledge
*/
QuickQueue.prototype.ackMessage = function (msg) {

    const deliveryTag = msg.fields.deliveryTag;

    if (internals.messages[deliveryTag]) {
        internals.channel.ack(msg);
        delete internals.messages[deliveryTag];
    }
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
* @param {hash} eventNames      (optional) A hash of events that will be
* emitted. Expects keys & values for any or all of the following 3 events:
* published, notPublished, & completed. Defaults to 'published', 'error',
* & 'allPublished'. The completed event is emitted if all the messages have
* successfully been published. The published event returns the message that was
* published, the notPublished event returns the error & the message that was not
* published.
*/
QuickQueue.prototype.enqueue = function (options, routing_key, messages, eventNames) {

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


        internals.channel.publish(this.exName, routing_key, item, options, (err, ok) => {

            if (err !== null) {
                this.emit(notPublished, err, item);
                allPublished = false;
            }
            else {
                this.emit(published, item);
            }

            cb(null, item);
        });
    }, () => {

        if (allPublished) {
            this.emit(completed);
        }
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
* @param {string} eventName     (optional) Name of event to emit when a message
* is consumed. Default is 'dequeue'. The event returns the message that was
* consumed & an AMQP channel. The message is not acknowledged.
*/
QuickQueue.prototype.dequeue = function (options, queue, eventName) {

    const consumerEvent = eventName || 'dequeue';

    this.channel.then((ch) => {

        internals.channel.consume(queue, (msg) => {

            const notQueued = !internals.isQueued(msg);
            internals.pushMessage(msg);

            /**
             * If this message has already been seen, don't emit event or run
             * callback
            */
            if (notQueued) {
                this.emit(consumerEvent, msg, ch);
            }
        }, options);
    });
};

const exportedQueue = new QuickQueue();
exportedQueue.setMaxListeners(0);

module.exports = exportedQueue;
