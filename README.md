# Quick Queue

Some minimal code that works with [amqplib](https://www.npmjs.com/package/amqplib) to quickly created a simple, usable setup.

## Initialize

```javascript
var = quickqueue = require('quickqueue');

var url = 'amqp://localhost';

var config = {
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
```

## Queue messages

```javascript
var options = {
  persistent: true,
  mandatory: false,
  contentType: 'text/plain'
}

var routing_key = 'rainbows';

var messages = ["I'm the first message", "I'm the second message"];

// Takes a boolean. true if all messages are published, false otherwise.
var callback = function(published) {
  if(published) {
    console.log('All messages have been published.');
  }
  else {
    console.log('Not all messages have been published.');
  }
}

quickqueue.enqueue(options, routing_key, messages, callback);
```

## Consume messages
```javascript
var options = {
  noAck: false,
  exclusive: true
}

var queue = 'queue1';

// Takes a message & channel.
var callback = function(msg, ch) {
  console.log(msg.content.toString());
  ch.ack();
}

quickqueue.dequeue(options, queue, callback);
```
