const hyperswarmRouter = async (network) => {
  return new Promise(async (resolve) => {

    if (typeof network !== 'string' && network.length != 64) throw new Error('network must be a 64 character hex string');

    const Hyperswarm = require('hyperswarm');
    const goodbye = (await import('graceful-goodbye')).default;
    const b4a = require('b4a');
    const cbor = require('cbor');
    
    const swarm = new Hyperswarm();
    goodbye(() => swarm.destroy());
    const peers = {};
    const handlers = {};

    async function broadcast(topic, data) {
      const encoded = b4a.from(cbor.encode({ topic, data }));
      return new Promise(async (done) => {
        for (const peer of Object.values(peers)) {
          peer.write(encoded);
        }
        done();
      });
    };

    swarm.on('connection', (peer, info) => {
      const id = b4a.toString(peer.remotePublicKey, 'hex');
      peers[id] = peer;
      peer.once('close', () => delete peers[id]);
      peer.on('data', async d => {
        const decoded = cbor.decode(b4a.from(d));
        if (handlers[decoded.topic]) await handlers[decoded.topic](decoded.data);
      });
      peer.on('error', e => console.log(`Connection error: ${e}`));
    });

    function join(topic, handler) {
      handlers[topic] = handler;
      const broadcaster = async (data) => {
        // console.log(topic, 'broadcasting ...'); confirmation
        await broadcast(topic, data);
      };
      return broadcaster;
    }

    const discovery = swarm.join(b4a.alloc(32).fill(network), { server: true, client: true });
    await discovery.flushed();
    await swarm.flush();
    swarm.listen();

    resolve({
      join,
      instanceOf: 'hyperswarmRouter'
    });

  });
};

module.exports = hyperswarmRouter;
