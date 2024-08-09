"use strict";
/*
    Server API which allows user to read/write json to the file system
*/
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _DataServices_secretKey;
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
// read port from argument or use default
const port = process.argv[2] || 3000;
/**
 * @type {Record<string, number>} versions
 */
const versions = { test: 0 };
class DataServices {
    constructor() {
        _DataServices_secretKey.set(this, "");
        // read secret key from environment variable
        __classPrivateFieldSet(this, _DataServices_secretKey, process.env.MBCVT_PUBLIC_KEY || "123", "f");
        console.log("Secret key:", __classPrivateFieldGet(this, _DataServices_secretKey, "f"));
    }
    publicKey() {
        // generate a public key from the secret key that can then be shared with the client
        // and verified by the server as a valid key
        const key = __classPrivateFieldGet(this, _DataServices_secretKey, "f");
        return key;
    }
    /**
     * @param {string} key
     */
    validateKey(key) {
        if (key !== __classPrivateFieldGet(this, _DataServices_secretKey, "f")) {
            throw new Error("Invalid key");
        }
    }
    /**
     * @param {string} topic
     */
    validateTopic(topic) {
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
    validateVersion(topic, json) {
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
    validateValue(value) {
        if (!value) {
            throw new Error("Invalid value");
        }
        // must be a valid JSON object
        try {
            return JSON.parse(value);
        }
        catch (e) {
            console.error(e);
            throw new Error("Invalid value");
        }
    }
    /**
     * @param {string} key
     * @param {string} topic
     * @param {string} value
     */
    save(key, topic, value) {
        this.validateKey(key);
        this.validateTopic(topic);
        const json = this.validateValue(value);
        this.validateVersion(topic, json);
        // write the value to the file system
        fs_1.default.writeFileSync(`./data/${topic}.json`, JSON.stringify(json, null, " "));
        return json.version;
    }
    /**
     * @param {any} key
     * @param {any} topic
     */
    read(key, topic) {
        this.validateKey(key);
        this.validateTopic(topic);
        // does the file exist?
        const fileName = `./data/${topic}.json`;
        if (!fs_1.default.existsSync(fileName)) {
            return "{}";
        }
        return fs_1.default.readFileSync(fileName, "utf8");
    }
}
_DataServices_secretKey = new WeakMap();
class WebServices {
    constructor() {
        this.dataServices = new DataServices();
    }
    /**
     * @param {{ key: string; topic: string; value: string; }} request
     */
    writeTopic(request) {
        const { key, topic, value } = request;
        return this.dataServices.save(key, topic, value);
    }
    /**
     * @param {{ key: string; topic: string; }} request
     */
    readTopic(request) {
        const { key, topic } = request;
        return this.dataServices.read(key, topic);
    }
}
// start listening on port 3000
const webServices = new WebServices();
const app = (0, express_1.default)();
// allow CORS
app.use((0, cors_1.default)());
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
        }
        catch (e) {
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
    }
    catch (e) {
        console.error(e);
        res.status(400).send(e);
    }
});
// server app files located in "../site" folder under the "/app" route
app.use("/app", express_1.default.static("../site"));
// if user is accessing the root, redirect them to the app
app.get("/", (req, res) => {
    res.redirect("/app");
});
// Create HTTP server
http_1.default.createServer(app).listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
// on error, restart the server
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    // restart app server
    http_1.default.createServer(app).listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
});
