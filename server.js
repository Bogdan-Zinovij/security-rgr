import net from "net";
import {
  decodeDataByPrivateKey,
  encodeDataBySessionKey,
  generateAsymmetricalKeys,
  generateRandomBytes,
  decodeDataBySessionKey,
} from "./functions.js";

const PORT = 3000;
const sessions = new Map();

const server = net.createServer(async (socket) => {
  const establishConnection = () => {
    return new Promise((resolve, reject) => {
      sessions.set(socket, {});

      const onDataHandler = (data) => {
        const dataFromClient = data.toString();
        try {
          const parsedData = JSON.parse(dataFromClient);
          switch (parsedData.action) {
            case "HELLO":
              console.log(`\n---------- ACTION: HELLO ----------`);

              const clientRandom = parsedData.data;
              console.log(
                `\nReceived client random hello. Client random: ${clientRandom}`
              );

              const serverRandom = generateRandomBytes(8);
              console.log(
                `Generate server random hello. Server random: ${serverRandom}\n`
              );
              const [publicKey, privateKey] = generateAsymmetricalKeys();
              console.log(
                `\nGenerated keys: \n  Public key: ${publicKey}\n  Private key: ${privateKey}`
              );

              Object.assign(sessions.get(socket), {
                clientRandom,
                serverRandom,
                publicKey,
                privateKey,
              });

              socket.write(
                JSON.stringify({
                  action: "HELLO",
                  data: [serverRandom, publicKey],
                })
              );

              console.log(
                `Send server random hello and public key to client.\n`
              );
              break;

            case "PREMASTER":
              console.log(`\n---------- ACTION: PREMASTER ----------`);

              const encodedPremaster = parsedData.data;
              const premaster = decodeDataByPrivateKey(
                encodedPremaster,
                sessions.get(socket).privateKey
              );

              console.log(`Decoded premaster by private key: ${premaster}`);

              const sessionKey =
                premaster +
                sessions.get(socket).clientRandom +
                sessions.get(socket).serverRandom;

              console.log(`Generated session key: ${sessionKey} \n`);

              Object.assign(sessions.get(socket), {
                premaster,
                sessionKey,
              });

              const encryptedReady = encodeDataBySessionKey(
                "READY",
                sessionKey
              );

              socket.write(
                JSON.stringify({
                  action: "READY",
                  data: encryptedReady,
                })
              );

              console.log(`Send encrypted READY message to client.`);
              break;

            case "READY":
              console.log(`\n---------- ACTION: READY --------------`);

              const clientReady = parsedData.data;
              const decodedReady = decodeDataBySessionKey(
                clientReady,
                sessions.get(socket).sessionKey
              );

              console.log(`Decoded READY message from client: ${decodedReady}`);

              socket.removeListener("data", onDataHandler);
              resolve(true);
              break;
          }
        } catch (error) {
          console.error("Error:", error.message);
          resolve(false);
        }
      };

      socket.on("data", onDataHandler);
    });
  };

  const isConnectionEstablished = await establishConnection();

  if (isConnectionEstablished) {
    console.log(
      "\n----- Secured connection is succesfully established! -----\n"
    );

    socket.on("data", (data) => {
      const dataFromClient = data.toString();
      const parsedData = JSON.parse(dataFromClient);
      console.log("Message from client:", parsedData.data);
    });

    socket.write(
      JSON.stringify({
        data: "Hello from server by secured connection!",
      })
    );
  }

  socket.on("end", () => {
    console.log("Server closed connection");
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
