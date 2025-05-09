const cluster = require("cluster");
const os = require("os");
const logger = require("./src/services/logger"); // adjust the path if needed

cluster.schedulingPolicy = cluster.SCHED_RR;

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  logger.info(`Master process ${process.pid} is running.`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
    logger.info(`Forked worker ${i + 1} of ${numCPUs}`);
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.warn(
      `Worker ${worker.process.pid} exited with code ${code} and signal ${signal}. Restarting...`
    );
    cluster.fork();
  });
} else {
  require("./server");
  logger.info(`Worker process ${process.pid} started.`);
}
