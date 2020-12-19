#!/usr/bin/env node

const DataClient = require('./data-client');
const applyAPI = require('./api');
const bole = require('bole');
const express = require('express');
const fs = require('fs').promises;
const next = require('next');
const pkg = require('../package');
const yargs = require('yargs');

const log = bole('bin');

const argv = yargs
    .scriptName('rsc-www')
    .alias('h', 'help')
    .option('c', {
        alias: 'config',
        type: 'string',
        describe: 'use a specific config.json file',
        default: './config.json'
    })
    .option('v', {
        alias: 'verbose',
        type: 'string',
        describe: 'the logging verbosity level',
        default: 'info',
        choices: ['debug', 'info', 'warn', 'error']
    })
    .version(pkg.version).argv;

bole.output({
    level: argv.verbose,
    stream: process.stdout
});

(async () => {
    let config;

    try {
        config = JSON.parse(await fs.readFile(argv.config));
    } catch (e) {
        process.exitCode = 1;
        log.error(e);
        return;
    }

    const dataClient = new DataClient();

    try {
        await dataClient.connect();
        await dataClient.authenticate();
    } catch (e) {
        process.exit(1);
        return;
    }

    const app = next({ dev: process.env.NODE_ENV !== 'production' });

    await app.prepare();

    const server = express();
    const handle = app.getRequestHandler();

    applyAPI(server, dataClient);
    server.all('*', handle);

    server.listen(config.port, (err) => {
        if (err) {
            log.error(err);
            process.exitCode = 1;
            return;
        }

        log.info(
            `listening for HTTP connections on http://localhost:${config.port}`
        );
    });
})();
