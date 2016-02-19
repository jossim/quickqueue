'use strict';

const Lab = require('lab');
const QuickQueue = require('../quickqueue.js');
const Assert = require('assert');

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const before = lab.before;


const config = {
    options: {
        durable: false,
        mandatory: false,
        persistent: false,
        deliveryMode: 1
    },
    exchange: {
        name: 'test',
        type: 'topic'
    },
    queues: [
        { name: 'test_queue', routingKey: 'test_queue' }
    ]
};

const amqpUrl = 'amqp://' + process.env.AMQP_PORT_5672_TCP_ADDR;
let quickChannel;
let q;

QuickQueue.on('publish', (item) => {

    console.log('Published item!! ', item.toString());
});

describe('Queue', () => {

    before((done) => {

        q = QuickQueue.initialize(amqpUrl, config);

        q.then((channel) => {

            quickChannel = channel;
            done();
        });
    });

    describe('Enqueuing', () => {

        it('should queue a message', (done) => {

            let msg;

            const message = 'test 1';

            q = quickChannel.purgeQueue('test_queue');

            q.then(() => {

                QuickQueue.enqueue({}, 'test_queue', [message], () => {

                    const test = function () {

                        msg = quickChannel.get('test_queue');

                        msg.then((value) => {

                            Assert.strictEqual(message,
                                                value.content.toString());

                            done();
                        });
                    };
                    setTimeout(test, 0);
                });
            });
        });

        it('should emit an event on message queue', (done) => {

            const message = 'test 4';

            q = quickChannel.purgeQueue('test_queue');

            q.then(() => {

                QuickQueue.enqueue({}, 'test_queue', [message], () => {});
            });

            QuickQueue.once('published', (item) => {

                Assert.strictEqual(message, item.toString());
                done();
            });
        });

        it('should report if all messages have been queued', (done) => {

            const messages = ['test 2', 'test 3'];
            let all = false;

            // Purge queue & queue messages.
            q = quickChannel.purgeQueue('test_queue');

            q.then(() => {

                QuickQueue.enqueue({}, 'test_queue', messages, (allPublished) => {

                    all = allPublished;
                    Assert.strictEqual(true, all);
                    done();
                });
            });
        });
    });

    describe('Dequeuing', () => {

        it('should get messages off a queue', (done) => {

            /*QuickQueue.on('test_queueDequeued', (item) => {

                console.log('Dequeued!', item.content.toString());
            });*/

            const message = ['test 5'];

            q = quickChannel.purgeQueue('test_queue');

            q.then(() => {

                QuickQueue.enqueue({}, 'test_queue', message, () => {});

                QuickQueue.dequeue({ consumerTag: 'dequeueTest' },
                'test_queue',
                (msg) => {

                    quickChannel.ack(msg);
                    Assert.strictEqual(message[0], msg.content.toString());

                    quickChannel.cancel('dequeueTest').then(() => {

                        done();
                    });
                });
            });
        });

        it('should emit event on dequeuing', (done) => {

            const message = ['test 6'];

            q = quickChannel.purgeQueue('test_queue');

            q.then(() => {

                QuickQueue.enqueue({}, 'test_queue', message, () => {});

                QuickQueue.dequeue({ consumerTag: 'eventTest' },
                                    'test_queue',
                                    () => {});

                QuickQueue.on('test_queueDequeued', (item) => {

                    Assert.strictEqual(message[0], item.content.toString());
                    done();
                });
            });
        });
    });
});
