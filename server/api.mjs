/* 
    Server API which allows user to read/write json to the file system
*/

import fs from 'fs';

class DataServices {

    constructor() {
        // read secret key from environment variable
        this.secretKey = process.env.JSON_SERVER_SECRET_KEY || "123";
    }

    publicKey() {
        // generate a public key from the secret key that can then be shared with the client
        // and verified by the server as a valid key
        const key = this.secretKey;
        return key;
    }

    validateKey(key) {
        if (key !== this.secretKey) {
            throw new Error('Invalid key');
        }
    }

    validateTopic(topic) {
        if (!topic) {
            throw new Error('Invalid topic');
        }

        // must only contain lowercase letters and numbers
        if (!/^[a-z0-9]+$/.test(topic)) {
            throw new Error('Invalid topic');
        }
    }

    validateValue(value) {
        if (!value) {
            throw new Error('Invalid value');
        }

        // must be a valid JSON object
        try {
            JSON.parse(value);
        } catch (e) {
            throw new Error('Invalid value');
        }
    }

    /**
     * @param {any} key
     * @param {any} topic
     * @param {any} value
     */
    save(key, topic, value) {
        this.validateKey(key);
        this.validateTopic(topic);
        this.validateValue(value);
        // write the value to the file system
        fs.writeFileSync(`./data/${topic}.json`, value);
    }

    /**
     * @param {any} key
     * @param {any} topic
     */
    read(key, topic) {
        this.validateKey(key);
        this.validateTopic(topic);
        return fs.readFileSync(`./data/${topic}.json`, 'utf8');
    }
}

class WebServices {

    constructor() {
        this.dataServices = new DataServices();
    }

    /**
     * @param {{ key: any; topic: any; value: any; }} request
     */
    handleRequest(request) {
        const { key, topic, value } = request;
        return this.dataServices.save(key, topic, value);
    }
}

// start listening on port 3000
const webServices = new WebServices();

import express from 'express'
import cors from 'cors'

const app = express()
const port = 3000;

// allow CORS
app.use(cors());

// listen for a POST request to /api, the body should be json
app.post('/api', (req, res) => {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const request = JSON.parse(body);
            const response = webServices.handleRequest(request);
            res.send(response);
        } catch (e) {
            res.status(400).send(e.message);
        }
    });
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})