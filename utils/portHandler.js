const net = require("net")

async function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.listen(startPort, () => {
      const port = server.address().port
      server.close(() => {
        resolve(port)
      })
    })

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        // Port is in use, try next port
        findAvailablePort(startPort + 1)
          .then(resolve)
          .catch(reject)
      } else {
        reject(err)
      }
    })
  })
}

module.exports = { findAvailablePort }
