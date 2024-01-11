import net from "net";
import {
  encodeDataByPublicKey,
  generateRandomBytes,
  encodeDataBySessionKey,
  decodeDataBySessionKey,
} from "./functions.js";

const PORT = 3000;
const sessionData = {};

const client = net.createConnection({ port: PORT }, async () => {
  const establishConnection = () => {
    return new Promise((resolve, reject) => {
      try {
        const clientRandom = generateRandomBytes(8);
        client.write(
          JSON.stringify({
            action: "HELLO",
            data: clientRandom,
          })
        );

        Object.assign(sessionData, { clientRandom });

        console.log(
          `\nSend client random hello to server. Client random: ${clientRandom}`
        );

        const onDataHandler = (data) => {
          const dataFromClient = data.toString();

          const parsedData = JSON.parse(dataFromClient);
          switch (parsedData.action) {
            case "HELLO":
              console.log(`\n---------- ACTION: HELLO --------------`);

              const [serverRandom, publicKey] = parsedData.data;
              console.log(
                `Get server hello and public key from server: \nServer random: ${serverRandom} \nPublic key: ${publicKey}`
              );

              const premaster = generateRandomBytes(8);
              const encodedPremaster = encodeDataByPublicKey(
                premaster,
                publicKey
              );

              console.log(
                `Generete and encode premaster. \n  Premaster: ${premaster}\n  Encoded premaster: ${encodedPremaster}`
              );

              client.write(
                JSON.stringify({
                  action: "PREMASTER",
                  data: encodedPremaster,
                })
              );

              console.log(`Send encoded premaster to server.`);

              const sessionKey = premaster + clientRandom + serverRandom;

              console.log(`Generated session key: ${sessionKey} \n`);

              Object.assign(sessionData, {
                serverRandom,
                premaster,
                sessionKey,
              });

              break;

            case "READY":
              console.log(`\n---------- ACTION: READY --------------`);

              const serverReady = parsedData.data;
              const decodedReady = decodeDataBySessionKey(
                serverReady,
                sessionData.sessionKey
              );
              console.log(`Decoded READY message from server: ${decodedReady}`);

              const encryptedReady = encodeDataBySessionKey(
                "READY",
                sessionData.sessionKey
              );

              client.write(
                JSON.stringify({
                  action: "READY",
                  data: encryptedReady,
                })
              );

              console.log(`Send encrypted READY message to server.`);

              client.removeListener("data", onDataHandler);
              resolve(true);
              break;
          }
        };

        client.on("data", onDataHandler);
      } catch (error) {
        console.log("Error:", error.message);
        reject(false);
      }
    });
  };

  const isConnectionEstablished = await establishConnection();

  if (isConnectionEstablished) {
    console.log(
      "\n----- Secured connection is succesfully established! -----\n"
    );

    client.on("data", (data) => {
      const dataFromServer = data.toString();
      const parsedData = JSON.parse(dataFromServer);
      console.log("Message from server:", parsedData.data);
    });

    client.write(
      JSON.stringify({
        data: "Hello from client by secured connection!",
      })
    );
  }

  client.on("end", () => {
    console.log("Client closed connection");
  });
});
