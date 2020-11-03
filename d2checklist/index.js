const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs');
const fs_promises = fs.promises
const readline = require('readline');
const {google} = require('googleapis');
const {GoogleSpreadsheet} = require('google-spreadsheet')

const downloadCSV = async (clan_number, close_on_completion, browser) => {
    browser = typeof browser !== 'undefined' ? browser : await puppeteer.launch({headless: false});
    const initPage = (await browser.pages())[0]
    const page = await browser.newPage()

    await page.on('load', async () => {
        console.log('Loaded: ' + page.url())
        await downloadCSV_(page)
        await page.close()
    })

    if (close_on_completion) {
        browser.on('targetdestroyed', async () => {
            if ((await browser.pages()).length === 1) {
                try {
                    await initPage.waitFor(2000)
                    await initPage.close()
                } catch (err) {
                    //pass
                }
            }
        })
    }

    await page.goto(`https://www.d2checklist.com/clan/${clan_number}/info`);



};

const downloadCSV_ = async (page) => {
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });
    console.log('Navigation achieved.')
    await page.waitForSelector('.ng-fa-icon.accent-text.ng-star-inserted')
    console.log('Selector achieved.')
    let button = await page.$('.mat-focus-indicator.mat-stroked-button.mat-button-base')
    await page.waitFor(D2CHECKLIST_LOAD_DELAY)
    await button.click()
    console.log('Button clicked.')
    return button
}

const importCSV = async (browser) => {
    // playground: 1c3A_4IpttnxASV4Jav13VpK6fkj-0JK_CgPD_FnnWvY  // 279931197
    // official: 1oWFPCrHyKy5kzQdteDj5NrUJBQ9OEGDCfeNX_9BT2iQ  // 1266473862
    // google-provided test sheet: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1c3A_4IpttnxASV4Jav13VpK6fkj-0JK_CgPD_FnnWvY/edit'

    browser = typeof browser !== 'undefined' ? browser : await puppeteer.launch({headless: false});
    const initPages = await browser.pages()
    const page = await browser.newPage()

    // page.on('load', async () => {
    //     console.log('Loaded: ' + page.url())
    //     await importCSV_(page)
    //     // await page.close()
    // })

    await page.goto(sheetUrl, {waitUntil: 'load'})
    await importCSV_(page)
}

const importCSV_ = async (page) => {
    // await page.waitFor(2000)
    // await page.waitForNavigation({
    //     waitUntil: 'networkidle0',
    // });
    // console.log('Navigation achieved.')
    // await page.waitForSelector('.ng-fa-icon.accent-text.ng-star-inserted')
    // console.log('Selector achieved.')
    // let button = await page.$('.mat-focus-indicator.mat-stroked-button.mat-button-base')
    // await button.click()
    // console.log('Button clicked.')
    let user_creds = require('./user-credentials.json')
    // console.log(user_creds)
    await page.type('#identifierId', user_creds['username'])

    await Promise.all([(await page.$('#identifierNext')).click(), page.waitForNavigation({waitUntil: 'networkidle0'})]);
    console.log('Navigation achieved.')


    let passwordOptionButton = await page.$('button.U26fgb.O0WRkf.oG5Srb.HQ8yf.C0oVfc.FliLIb.uRo0Xe.NaOGkc.M9Bg4d')

    if (passwordOptionButton !== null) {
        await passwordOptionButton.click()
    }

    let moreOptionButton = await page.$('span.RveJvd.snByac')

    if (moreOptionButton !== null) {
        await moreOptionButton.click()
    }

    // div.lCoei.YZVTmd.SmR8 for Enter Your Password button
    // #docs-file-menu for File menu button

    await page.waitForSelector('#password')
    await page.waitFor(1000)
    await page.type('#password', user_creds['password'])
    await (await page.$('#passwordNext')).click()







    //pass
}

const sleep = milliseconds => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        // oAuth2Client.on('tokens', (tokens) => {
        //     if (tokens.refresh_token) {
        //         // store the refresh_token in my database!
        //         console.log(tokens.refresh_token);
        //     }
        //     console.log(tokens.access_token);
        // });
        try {
            callback(oAuth2Client);
        } catch (err) {
            console.error(err)
        }

    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Imports csv from d2checklist into sheet and sorts appropriately:
 * @see BOOP POTW Google sheet
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
    const sheets = google.sheets({version: 'v4', auth});

    sheets.spreadsheets.values.get({
        // playground: 1c3A_4IpttnxASV4Jav13VpK6fkj-0JK_CgPD_FnnWvY BOOP!A1:BR101
        // official: 1oWFPCrHyKy5kzQdteDj5NrUJBQ9OEGDCfeNX_9BT2iQ BOOP!
        // google-provided test sheet: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        range: 'Class Data!A2:E',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log('Name, Major:');
            // Print columns A and E, which correspond to indices 0 and 4.
            rows.map((row) => {
                console.log(`${row[0]}, ${row[4]}`);
            });
        } else {
            console.log('No data found.');
        }
    });
}

function getNewTokenAsync(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

const importCsvUsingGApi = async (auth, values) => {
    if (!values && !VALUES) return console.error('Values is empty:', values)
    if (!values) values = VALUES

    // values = [
    //     ['hello', 'world', 'hello'],
    //     ['hello', 'world', 'hello', 'world'],
    //     ['hello', 'world', 'hello', 'world', 'hello'],
    //     ['hello', 'world', 'hello', 'world'],
    //     ['hello', 'world', 'hello']
    // ]

    const sheets = google.sheets({version: 'v4', auth})
    console.log('Updating spreadsheet...')
    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: '1oWFPCrHyKy5kzQdteDj5NrUJBQ9OEGDCfeNX_9BT2iQ',
        resource: {
            valueInputOption: 'USER_ENTERED',
            data: [{
                range: 'BOOP!A1:CD101',
                majorDimension: 'ROWS',
                values: values
            }]
        }
    }, (err, res) => {
        if (err) return console.error('The API returned an error: ' + err)
        const rows = res.data.values
        if (rows && rows.length) {
            console.log('Rows')
            rows.map(row => console.log(row))
        } else {
            console.log('No data received.')
        }
    });
}

const importCsvUsingGsApi = async (auth, token) => {
    // const creds = require('./d2checklist-1586736924438-2a15d312da26-credentials.json')
    const doc = new GoogleSpreadsheet('1c3A_4IpttnxASV4Jav13VpK6fkj-0JK_CgPD_FnnWvY');



    // let oauth2_token = auth['credentials']['access_token']
    // console.log('Compare tokens: ' + (oauth2_token_direct === oauth2_token))
    // console.log(auth)
    // console.log('Direct: ' + oauth2_token)
    // console.log('Indirect: ' + oauth2_token)

    await doc.useRawAccessToken(oauth2_token_direct)
    //
    // await doc.loadInfo()
    // // let sheetIndex = 0
    // // for (const worksheet in doc.sheetsByIndex) {
    // //     if (worksheet['_rawSheets']['title'] === 'BOOP') {
    // //         sheetIndex =
    // //     }
    // //
    // // }
    // console.log(await doc.sheetCount)
    // console.log(doc.sheetsByIndex)
}

const parseCsvIntoValues = async (filepath) => {
    let csv_content;
    try {
        csv_content = await fs_promises.readFile(filepath)
        global.VALUES = await parseCsvContentIntoValues(csv_content.toString())
        return VALUES
    } catch (err) {
        console.error('Error loading csv file:', err)
    }
    global.VALUES = []
    return VALUES
}

const parseCsvContentIntoValues = async (content) => {
    let values = []
    if (!content) return values
    let values_list;
    for (let row of content.split('\n')) {
        values_list = row.split(',')
        if (values_list.length > 1) values.push(row.split(','))
    }
    let empty_entry = values[0].map(val => '')
    while (values.length < 101) {
        values.push(empty_entry)
    }
    return values
}

function startWaiting(path, callback, timeout) {
    const timer = setTimeout(function () {
        stopWaiting(path);
        console.log('Timed out while waiting for file at:', path)
        // callback('Timed out.');
    }, timeout);

    fs.watchFile(path, {persistent: true, interval: 500}, function (curr, prev) {
        onChanged(curr, prev, path, timer, callback);
    });
}

function stopWaiting(path) {
    fs.unwatchFile(path, this);
}

function onChanged(current, previous, path, timer, clientCallback) {
    let type = 'File modified.';
    if (current.mode === 0 && previous.mode === 0) type = 'No file.';
    else if (current.mode > 0 && previous.mode === 0) type = 'File created.';
    else if (current.mode === 0 && previous.mode > 0) type = 'File deleted.';

    if (type !== 'No file.') {
        stopWaiting(path);
        clearTimeout(timer);
    }

    // clientCallback(type, current, previous);

    if (type === 'File created.') {
        const delayed_callback = setTimeout(clientCallback, 2000, path)
    }

}

const main = async () => {

    // If modifying these scopes, delete token.json.
    global.SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
    // The file token.json stores the user's access and refresh tokens, and is
    // created automatically when the authorization flow completes for the first
    // time.
    global.TOKEN_PATH = 'token.json';

    global.D2CHECKLIST_LOAD_DELAY = 80000 // in ms

    let boop_number = 3063489

    // puppeteer.use(StealthPlugin())

    let browser = await puppeteer.launch({headless: false});
    await downloadCSV(boop_number, true, browser).then(() => console.log('Finished.'))

    let today_date = new Date().toISOString().replace(/T.+/, '')
    let file_path = `D:/Downloads/clan-progress-${today_date}.csv`

    // startWaiting(file_path, parseCsvIntoValues, D2CHECKLIST_LOAD_DELAY + 20000)

    // setTimeout(fs.readFile, D2CHECKLIST_LOAD_DELAY + 25000, 'credentials.json', (err, content) => {
    //     if (err) return console.error('Error loading client secret file:', err);
    //     // Authorize a client with credentials, then call the Google Sheets API.
    //     authorize(JSON.parse(content), importCsvUsingGApi);
    // });

    // await fs.readFile('credentials.json', (err, content) => {
    //     if (err) return console.error('Error loading client secret file:', err);
    //     // Authorize a client with credentials, then call the Google Sheets API.
    //     authorize(JSON.parse(content), importCsvUsingGApi);
    // });

    // global.VALUES = await parseCsvIntoValues(file_path)




    // let browser2 = await puppeteer.launch({headless: false})
    // await importCSV(browser2)



    // Load client secrets from a local file.
    // await fs.readFile('credentials.json', (err, content) => {
    //     if (err) return console.error('Error loading client secret file:', err);
    //     // Authorize a client with credentials, then call the Google Sheets API.
    //     authorize(JSON.parse(content), listMajors);
    // });

    // await fs.readFile('credentials.json', (err, content) => {
    //     if (err) return console.error('Error loading client secret file:', err);
    //     // Authorize a client with credentials, then call the Google Sheets API.
    //     authorize(JSON.parse(content), importCsvUsingGApi);
    // });




    // await importCSV(null)

    // const creds = require('./d2checklist-1586736924438-2a15d312da26-credentials.json'); // the file saved above




}

main().then(r => console.log('Main finished.'))