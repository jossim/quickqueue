'use strict';

const Lab = require('lab');
const QuickQueue = require('../quickqueue.js');
const Assert = require('assert');

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const before = lab.before;
const beforeEach = lab.beforeEach;


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

describe('Queue', () => {

    before((done) => {

        q = QuickQueue.initialize(amqpUrl, config);

        q.then((channel) => {

            quickChannel = channel;
            done();
        });
    });

    beforeEach((done) => {

        quickChannel.purgeQueue('test_queue').then(() => {

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

            QuickQueue.enqueue({}, 'test_queue', [message], () => {});

            QuickQueue.once('published', (item) => {

                Assert.strictEqual(message, item.toString());
                done();
            });
        });

        it('should emit a custom event on message queue', (done) => {

            const message = 'test custom';
            const eName = { published: 'customPublished' };

            QuickQueue.enqueue({}, 'test_queue', [message], () => {}, eName);

            QuickQueue.once('customPublished', (item) => {

                Assert.strictEqual(message, item.toString());
                done();
            });
        });

        it('should emit a custom event on queuing all messages', (done) => {

            const messages = ['test custom1', 'test custom2'];
            const eNames = { completed: 'customComplete' };

            QuickQueue.enqueue({}, 'test_queue', messages, () => {}, eNames);

            QuickQueue.once('customComplete', () => {

                QuickQueue.dequeue(
                    { consumerTag: 'customComplete' },
                    'test_queue',
                    () => {},
                    'dequeueComplete'
                );
            });

            let dCount = 0;
            const dQmessages = [];

            QuickQueue.on('dequeueComplete', (msg, ch) => {

                ++dCount;
                dQmessages.push(msg.content.toString());

                if (dCount === 2) {

                    Assert.strictEqual(dQmessages[0], messages[0]);
                    Assert.strictEqual(dQmessages[1], messages[1]);

                    quickChannel.cancel('customComplete').then(() => {

                        done();
                    });
                }
            });
        });

        it('should report if all messages have been queued', (done) => {

            const messages = ['test 2', 'test 3'];
            let all = false;


            QuickQueue.enqueue({}, 'test_queue', messages, (allPublished) => {

                all = allPublished;
                Assert.strictEqual(true, all);
                done();
            });
        });
    });

    describe('Dequeuing', () => {

        it('should get messages off a queue', (done) => {

            const message = ['test 5'];

            QuickQueue.enqueue({}, 'test_queue', message, () => {});

            QuickQueue.dequeue({ consumerTag: 'dequeueTest' }, 'test_queue',
            (msg) => {

                QuickQueue.ackMessage(msg);
                Assert.strictEqual(message[0], msg.content.toString());

                quickChannel.cancel('dequeueTest').then(() => {

                    done();
                });
            });
        });

        it('should emit event on dequeuing', (done) => {

            const message = ['test 6'];

            QuickQueue.enqueue({}, 'test_queue', message, () => {});

            QuickQueue.dequeue({ consumerTag: 'eventTest' },
                                'test_queue',
                                () => {});

            QuickQueue.once('dequeue', (msg, ch) => {

                QuickQueue.ackMessage(msg);

                Assert.strictEqual(message[0], msg.content.toString());

                quickChannel.cancel('eventTest').then(() => {

                    done();
                });
            });
        });

        it('should emit custom event on dequeuing', (done) => {

            const message = 'test custom dequeue';

            QuickQueue.enqueue({}, 'test_queue', [message], () => {});

            QuickQueue.dequeue({ consumerTag: 'customEventTest' },
                                'test_queue',
                                () => {},
                                'customD');

            QuickQueue.on('customD', (item) => {

                Assert.strictEqual(message, item.content.toString());

                quickChannel.cancel('customEventTest').then(() => {

                    done();
                });
            });
        });


        it('should dequeue multiple messages & emit same number of events',
        (done) => {

            const messages = ['test 7', 'test 8', 'test 9'];

            QuickQueue.enqueue({}, 'test_queue', messages, () => {});

            QuickQueue.dequeue({ consumerTag: 'eventMultiTest' },
                                'test_queue',
                                () => {},
                                'multiTest');

            const dMessages = [];
            let count = 0;

            QuickQueue.on('multiTest', (msg, ch) => {

                ++count;
                dMessages.push(msg.content.toString());
                QuickQueue.ackMessage(msg);

                if (count === 3) {
                    Assert.strictEqual(messages.length, dMessages.length);
                    Assert.strictEqual(messages[0], dMessages[0]);
                    Assert.strictEqual(messages[1], dMessages[1]);
                    Assert.strictEqual(messages[2], dMessages[2]);

                    quickChannel.cancel('eventMultiTest').then(() => {

                        done();
                    });
                }
            });
        });
    });
});
