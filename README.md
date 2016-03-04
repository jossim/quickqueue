# Quick Queue

Some minimal code that works with [amqplib](https://www.npmjs.com/package/amqplib) to quickly create a simple, usable AMQP setup in Node.js.

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

// Returns a promise that resolves to a channel from amqplib or
// rejects with an error message.
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

QuickQueue.enqueue(
    options,
    routing_key,
    messages,
    { // 3 events that enqueue could emit
        published: 'published',
        notPublished: 'notPublished',
        completed: 'allPublished'
    }
);

QuickQueue.on('published', (item) => {

    // The item is a bufferized version of an individual message. The item
    // passed to this event is not a queued version of the message. However if
    // this event fires, the message has been queued.
    const msg = item.toString();
    console.log('This message was published', msg);
});

QuickQueue.on('allPublished', () => {

    console.log('All messages have been published');
});

QuickQueue.on('notPublished', (err, item) => {

    const msg = item.toString();
    console.error('Error', err);
    console.log('This message was not published', msg);
});
```

## Consume messages
```javascript
const options = {
  noAck: false,
  exclusive: true
}

const queue = 'queue1';
const eventName = 'dequeue';

QuickQueue.dequeue(options, queue, eventName);

QuickQueue.on('dequeue', (msg, ch) => {

    console.log(msg.content.toString());

    // Acknowledge the message
    QuickQueue.ackMessage(msg);
});
```
