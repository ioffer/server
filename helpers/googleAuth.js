/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable camelcase */
// [START people_quickstart]
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL,GOOGLE_AUTHORIZATION_CODE, GOOGLE_REFRESH_TOKEN} = require("../config");

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    console.log('inside loadSavedCredentialsIfExist')
    try {
        const content = await fs.readFile(TOKEN_PATH);
        console.log(content)
        console.log('inside loadSavedCredentialsIfExist 1')

        const credentials = JSON.parse(content);
        console.log('inside loadSavedCredentialsIfExist 2')

        return google.auth.fromJSON(credentials);
    } catch (err) {
        console.log('Error=> inside loadSavedCredentialsIfExist')
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    console.log('inside google Auth')
    let client = await loadSavedCredentialsIfExist();
    console.log('inside google Auth2')
    if (client) {
        console.log("client:", client)
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    console.log("new client", client)
    if (client.credentials) {
        console.log('client.credentials:', client.credentials)
        await saveCredentials(client);
    }
    return client;
}

/**
 * Print the display name if available for 10 connections.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getAccessToken(auth) {
    const oAuth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URL
    );
    const code = decodeURIComponent(GOOGLE_AUTHORIZATION_CODE);
    return new Promise((resolve, reject) => {

        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                return reject(err);
            }
            return resolve(token);
        });
    })
        .then((token) => {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: token,
            };
        })
        .catch((err) => {
            console.error(err);
            return {
                statusCode: 500,
                body: err,
            };
        });
}

async function main() {
    try {

        let auth = await authorize();
        if (auth) {
            console.log('✅ Authorization completed');
            let accessToken = await getAccessToken();
            console.log('✅ listConnectionNames completed', accessToken);
        } else {
            console.error("Error here");
        }
    }catch (e) {
        console.error("Error here:", e);
    }

}

module.exports = main

// [END people_quickstart]
