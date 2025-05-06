const cluster = require('cluster');
const os = require('os');// Import server from the module

cluster.schedulingPolicy = cluster.SCHED_RR;

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Optionally, restart the worker
    cluster.fork();
  });

} else {
    require("./server")
  console.log(`Worker ${process.pid} started`);
}
