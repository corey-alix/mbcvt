/* 
    Server API which allows user to read/write json to the file system
*/

import fs from "fs";
import express from "express";
import cors from "cors";
import http from "http";

// read port from argument or use default
const port = process.argv[2] || 3000;

/**
 * @type {Record<string, number>} versions
 */
const versions = { test: 0 };

class DataServices {
  #secretKey = "";
  constructor() {
    // read secret key from environment variable
    this.#secretKey = process.env.MBCVT_PUBLIC_KEY || "123";
    console.log("Secret key:", this.#secretKey);
  }

  publicKey() {
    // generate a public key from the secret key that can then be shared with the client
    // and verified by the server as a valid key
    const key = this.#secretKey;
    return key;
  }

  /**
   * @param {string} key
   */
  validateKey(key: string) {
    if (key !== this.#secretKey) {
      throw new Error("Invalid key");
    }
  }

  /**
   * @param {string} topic
   */
  validateTopic(topic: string) {
    if (!topic) {
      throw new Error("Invalid topic");
    }

    // must only contain lowercase letters and numbers
    if (!/^[a-z0-9]+$/.test(topic)) {
      throw new Error("Topic must only contain lowercase letters and numbers");
    }
  }

  /**
   * @param {string} topic
   * @param {{ version: number; }} json
   */
  validateVersion(topic: string | number, json: { version: number; }) {
    const expectedVersion = versions[topic] || 0;
    const actualVersion = json.version || 0;
    if (actualVersion < expectedVersion) {
      console.error("Invalid version", { expectedVersion, actualVersion });
      throw new Error("Invalid version");
    }
    json.version = versions[topic] = actualVersion + 1;
    console.log("Version:", json.version);
  }

  /**
   * @param {string} value
   */
  validateValue(value: string) {
    if (!value) {
      throw new Error("Invalid value");
    }

    // must be a valid JSON object
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
      throw new Error("Invalid value");
    }
  }

  /**
   * @param {string} key
   * @param {string} topic
   * @param {string} value
   */
  save(key: string, topic: any, value: any) {
    this.validateKey(key);
    this.validateTopic(topic);
    const json = this.validateValue(value);
    this.validateVersion(topic, json);
    // write the value to the file system
    fs.writeFileSync(`./data/${topic}.json`, JSON.stringify(json, null, " "));
    return json.version;
  }

  /**
   * @param {any} key
   * @param {any} topic
   */
  read(key: string, topic: any) {
    this.validateKey(key);
    this.validateTopic(topic);
    // does the file exist?
    const fileName = `./data/${topic}.json`;
    if (!fs.existsSync(fileName)) {
      return "{}";
    }
    return fs.readFileSync(fileName, "utf8");
  }
}

class WebServices {
  dataServices: DataServices;
  constructor() {
    this.dataServices = new DataServices();
  }

  /**
   * @param {{ key: string; topic: string; value: string; }} request
   */
  writeTopic(request: { key: any; topic: any; value: any; }) {
    const { key, topic, value } = request;
    return this.dataServices.save(key, topic, value);
  }

  /**
   * @param {{ key: string; topic: string; }} request
   */
  readTopic(request: { key: any; topic: any; }) {
    const { key, topic } = request;
    return this.dataServices.read(key, topic);
  }
}

// start listening on port 3000
const webServices = new WebServices();

const app = express();

// allow CORS
app.use(cors());

// listen for a POST request to /api, the body should be json
app.post("/api", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const request = JSON.parse(body);
      const version = webServices.writeTopic(request);
      res.setHeader("Content-Type", "application/json");
      res.send({ version });
    } catch (e) {
      console.error(e);
      res.setHeader("Content-Type", "application/json");
      res.status(400).send({ error: e });
    }
  });
});

app.get("/api/:topic", (req, res) => {
  const key = (req.headers["x-api-key"] || req.query.key || "123") + "";
  const topic = req.params.topic;
  console.log({ key, topic });
  try {
    const response = webServices.readTopic({ key, topic });
    // as json
    res.format({
      "application/json": function () {
        res.send(response);
      },
    });
  } catch (e) {
    console.error(e);
    res.status(400).send(e);
  }
});

// server app files located in "../site" folder under the "/app" route
app.use("/app", express.static("../site"));

// if user is accessing the root, redirect them to the app
app.get("/", (req, res) => {
  res.redirect("/app");
});

// Create HTTP server
http.createServer(app).listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});


// on error, restart the server
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // restart app server
  http.createServer(app).listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
});