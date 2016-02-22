# Quick Queue

Some minimal code that works with [amqplib](https://www.npmjs.com/package/amqplib) to quickly created a simple, usable setup.

## Initialize

```javascript
const QuickQueue = require('quickqueue');

const url = 'amqp://localhost';

const config = {
  // These options are applied to the exchange & queues as applicable.
  options: {
    durable: true,
    persistent: false,
  },
  exchange: { // All of the queues will be bound to this exchange.
    name: 'theExchangeName',
    type: 'topic'
  },
  queues: [
    { name: 'queue1', routingKey: 'rainbows' },
    { name: 'queue2', routingKey: 'butterflies' }
  ]
}

// Returns a promise with the value of a channel from amqplib
QuickQueue.initialize(url, config);
```

## Queue messages

```javascript
const options = {
  persistent: true,
  mandatory: false,
  contentType: 'text/plain'
}

const routing_key = 'rainbows';

const messages = ['I\'m the first message', 'I\'m the second message'];

// Takes a boolean. true if all messages are published, false otherwise.
const callback = function (published) {

    if(published) {
        console.log('All messages have been published.');
    }
    else {
        console.log('Not all messages have been published.');
    }
};

QuickQueue.enqueue(options, routing_key, messages, callback);
```

## Consume messages
```javascript
const options = {
  noAck: false,
  exclusive: true
}

const queue = 'queue1';

// Takes a message & channel.
const callback = function (msg, ch) {

    console.log(msg.content.toString());
    ch.ack();
};

QuickQueue.dequeue(options, queue, callback);
```
