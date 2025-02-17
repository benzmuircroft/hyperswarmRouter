# 🕳️🥊hyperswarmRouter 🌐 

Allows many topic handlers for different modules over one hyperswarm. Just plug this one swarm into all of them.

## Installation
```
npm install "github:benzmuircroft/hyperswarmRouter"
```

## Usage
See: [hyperswarmCRDT/README](https://github.com/benzmuircroft/hyperswarmCRDT/blob/main/README.md)

## API
```js
const network = 'c915296031bf40b58ef7f1d6b883512e799c1982b83acdc7ce27a2079a8c196f'; // a hard-coded 64 character hex string
const router = await require('hyperswarmRouter')(network);
let broadcast1, broadcast2;
// connect to peers on 'topic1'
broadcast1 = await router.join('topic1', async function handler1(data) {
  // get and handle broadcasts from peers on 'topic1' here
  console.log(data);
});
// now you can broadcast data to peers on 'topic1'
await broadcast1({ info: 'xyz' });
// connect to peers on 'topic2'
broadcast2 = await router.join('topic2', async function handler2(data) {
  // get and handle broadcasts from peers on 'topic2' here
  console.log(data);
});
// now you can broadcast data to peers on 'topic2'
await broadcast2({ type: 'dog', age: 3, array: [0, 1, 2, 3] });
```

## TODO

- add to [userbase](https://github.com/benzmuircroft/userbase) 
- add to [hypercache](https://github.com/benzmuircroft/hypercache)
- add to [hyperdown](https://github.com/benzmuircroft/hyperdown)
