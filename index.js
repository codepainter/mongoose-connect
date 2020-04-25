const mongoose = require('mongoose')
const fp = require('fastify-plugin')
const { accessEnv } = require('../helpers')

const log = require('debug')('libraries:mongoose')
const options = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  autoIndex: true,
  // reconnectTries    : Number.MAX_VALUE,   // Never stop trying to reconnect
  // reconnectInterval : 500,                // Reconnect every 500ms
  poolSize: 5, // Maintain up to 5 socket connections
  // If not connected, return errors immediately rather than waiting for reconnect
  bufferMaxEntries: 0,
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  useUnifiedTopology: true
}

module.exports = {
  fastify: fp(fastify),
  express,
  mongoMemoryDB
}

function fastify (fastify, opts, next) {
  log('fastify:', opts)
  const NODE_ENV = accessEnv('NODE_ENV', 'local')
  const connection = connect({
    ...opts,
    debug: NODE_ENV !== 'production'
  })

  fastify.addHook('onClose', (fastify, done) => connection.close(done))

  connection.once('open', () => {
    log(`Connected to: ${opts.uri} DB: ${opts.dbName}`)
  })
  fastify.decorate('mongo', connection)
  next()
}

function express (opts, callback) {
  log('express:', opts)
  const NODE_ENV = accessEnv('NODE_ENV', 'local')
  const connection = connect({
    ...opts,
    debug: NODE_ENV !== 'production'
  })

  connection.once('open', () => {
    log(`Connected to: ${opts.uri} DB: ${opts.dbName}`)
    callback()
  })
}

function mongoMemoryDB ({ dbName = undefined } = {}) {
  log('mongoMemoryDB:', dbName)
  const { MongoMemoryServer } = require('mongodb-memory-server')

  const instance = {}
  if (dbName) {
    instance.dbName = dbName
  }
  const mongod = new MongoMemoryServer({ instance })

  return mongod
}

function connect ({ uri = 'mongodb://localhost:27017/test', dbName = 'test', debug = false }) {
  log('connect:', { uri, dbName, debug })
  mongoose.set('debug', debug)
  mongoose.connect(uri, { dbName, ...options })
  const db = mongoose.connection
  db.on('error', err => {
    log('Failed to connect to database', err)
    process.exit(1)
  })
  return db
}
