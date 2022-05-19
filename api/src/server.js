#!/usr/bin/env node

/**
 * Module dependencies.
 */
import dotenv from 'dotenv';
dotenv.config({
  path: '.env',
});
import app from './app';
import http from 'http';
import cluster from 'cluster';
import os from 'os';
let workers = [];

http.globalAgent.maxSockets = Infinity;

if (cluster.isMaster) {
  setupWorkerProcesses();
} else {
  var port = normalizePort(process.env.PORT || '4000');
  app.set('port', port);

  var server = http.createServer(app);

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
}

/**
 * Setup number of worker processes to share port which will be defined while setting up server
 */
function setupWorkerProcesses() {
  let numCores = os.cpus().length;
  console.log('Master cluster setting up ' + numCores + ' workers');
  for (let i = 0; i < numCores; i++) {
    workers.push(cluster.fork());
    workers[i].on('message', function (message) {
      console.log(message);
    });
  }

  cluster.on('online', function (worker) {
    console.log('Worker ' + worker.process.pid + ' is listening');
  });
  cluster.on('exit', function (worker, code, signal) {
    console.log(
      'Worker ' +
        worker.process.pid +
        ' died with code: ' +
        code +
        ', and signal: ' +
        signal
    );
    console.log('Starting a new worker');
    cluster.fork();
    workers.push(cluster.fork());

    workers[workers.length - 1].on('message', function (message) {
      console.log(message);
    });
  });
}

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}

// module.exports = server;
