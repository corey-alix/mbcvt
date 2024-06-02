/* 
    Server API which allows user to read/write json to the file system
*/

import fs from 'fs';
import express from 'express'
import cors from 'cors'
import https from 'https';

// read port from argument or use default
const port = process.argv[2] || 3000;

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

    /**
     * @param {string} key
     */
    validateKey(key) {
        if (key !== this.secretKey) {
            throw new Error('Invalid key');
        }
    }

    /**
     * @param {string} topic
     */
    validateTopic(topic) {
        if (!topic) {
            throw new Error('Invalid topic');
        }

        // must only contain lowercase letters and numbers
        if (!/^[a-z0-9]+$/.test(topic)) {
            throw new Error('Invalid topic');
        }
    }

    /**
     * @param {string} value
     */
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
     * @param {string} key
     * @param {string} topic
     * @param {string} value
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


const app = express()


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
            const response = webServices.writeTopic(request);
            res.send(response);
        } catch (e) {
            res.status(400).send(e);
        }
    });
});


app.get('/api/:topic', (req, res) => {
    const key = req.headers['x-api-key'] || req.query.key || "123";
    const topic = req.params.topic;
    console.log({ key, topic })
    try {
        const response = webServices.readTopic({ key, topic });
        // as json
        res.format({
            'application/json': function () {
                res.send(response);
            }
        });
    } catch (e) {
        res.status(400).send(e);
    }
});

// server app files located in "../site" folder under the "/app" route
app.use('/app', express.static('../site'));

// SSL certificate files, to generate a private key and certificate, you can use openssl
// openssl req -nodes -new -x509 -keyout server.key -out server.cert

const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.cert')
};

// Create HTTPS server
https.createServer(options, app).listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});