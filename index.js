/**
 * hyperswarmRouter - A module to create a Hyperswarm-based router for decentralized peer-to-peer communication.
 * 
 * This module allows peers to join a network, broadcast messages to specific topics, and handle incoming messages.
 * It uses Hyperswarm for peer discovery and connection management, CBOR for message encoding/decoding, and b4a for buffer manipulation.
 * 
 * @param {string} network - A 64-character hex string representing the network identifier.
 * @returns {Promise<Object>} - Resolves to an object containing methods to join/leave topics and a flag indicating it's a Hyperswarm router.
 */
const hyperswarmRouter = async (network) => {
  return new Promise(async (resolve) => {

    // Validate the network parameter
    if (typeof network !== 'string' && network.length != 64) throw new Error('network must be a 64 character hex string');

    // Import required modules
    const Hyperswarm = require('hyperswarm');
    const goodbye = (await import('graceful-goodbye')).default;
    const b4a = require('b4a');
    const cbor = require('cbor');
    const Protomux = require('protomux');
    const c = require('compact-encoding');
    let userbase
    ,   hyperdown;
    
    // Initialize Hyperswarm and set up graceful shutdown
    const swarm = new Hyperswarm();
    goodbye(() => swarm.destroy());

    // Store connected peers and topic handlers
    const peers = {};
    const handlers = {};


    /**
     * Broadcast a message to all connected peers on a specific topic.
     * 
     * @param {string} topic - The topic to broadcast the message to.
     * @param {any} data - The data to broadcast.
     * @returns {Promise<void>} - Resolves when the message has been sent to all peers.
     */
    async function broadcast(topic, data) {
      if (data.message) console.log('router broadcasting:', data, 'to:', topic);
      const encoded = b4a.from(cbor.encode({ topic, data }));
      return new Promise(async (done) => {
        for (const peer of Object.values(peers)) {
          peer.send(encoded);
        }
        done();
      });
    };

    // Handle new peer connections
    swarm.on('connection', (peer, info) => {
      if (userbase) userbase(peer); // experimental
      if (hyperdown) hyperdown(peer); // experimental
      const id = b4a.toString(peer.remotePublicKey, 'hex');
      const mux = new Protomux(peer);
      const protocol = mux.createChannel({
        protocol: 'router-broadcast',
        onopen () {
          console.log('the other side opened this protocol!');
        },
        onclose () {
          console.log('either side closed the protocol');
        }
      });
      peers[id] = protocol.addMessage({ // Add peer to the peers object
        encoding: c.binary,
        onmessage: async (d) => { // Handle incoming data from the peer
          const decoded = cbor.decode(b4a.from(d));
          if (handlers[decoded.topic]) await handlers[decoded.topic](decoded.data);
        }
      });
      protocol.open();
      // Remove peer from the peers object when the connection closes
      peer.once('close', () => delete peers[id]);
      // Log connection errors
      peer.on('error', e => console.log(`Connection error: ${e}`));
    });

    /**
     * Join a topic and register a handler for incoming messages on that topic.
     * 
     * @param {string} topic - The topic to join.
     * @param {Function} handler - The handler function to process incoming messages on the topic.
     * @returns {Function} - A function to broadcast messages to the topic.
     */
    function join(topic, handler) {
      handlers[topic] = handler; // Register the handler for the topic

      // Return a broadcaster function for the topic
      const broadcaster = async (data) => {
        await broadcast(topic, data);
      };
      return broadcaster;
    }

    /**
     * Leave a topic and remove its handler.
     * 
     * @param {string} topic - The topic to leave.
     * @returns {Function} - A dummy function that warns if attempting to broadcast to the deleted topic.
     */
    function leave(topic) {
      if (!handlers[topic]) throw new Error(`trying to leave a topic:'${topic}' that does not exist would cause weird results.`);
      delete handlers[topic]; // Remove the topic handler

      // Return a dummy function to warn about broadcasting to a deleted topic
      return () => {
        console.warn(`Attempting to broadcast to a topic:'${topic}' that has been deleted`);
        return null;
      };
    }

    // Join the Hyperswarm network and wait for the discovery process to complete
    let started = false;
    async function reload() {
      if (started) {
        // todo: drain all peers and cork them
        swarm.destroy();
        started = false;
      }
      // uncork the peers
      const discovery = swarm.join(b4a.alloc(32).fill(network), { server: true, client: true });
      await discovery.flushed();
      await swarm.flush();
      swarm.listen();
      started = true;
    }
    await reload();


    // Resolve the promise with the router interface
    resolve({
      reload, // used by userbase
      join,
      leave,
      isHyperswarmRouter: true
    });

  });
};

module.exports = hyperswarmRouter;
