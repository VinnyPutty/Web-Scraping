const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const fs_promises = fs.promises
const readline = require('readline');
const {google} = require('googleapis');
const pth = require('path');
const os = require('os');

const downloadCSV = async (clan_number, close_on_completion, browser) => {
    browser = typeof browser !== 'undefined' ? browser : await puppeteer.launch({headless: false});
    const initPage = (await browser.pages())[0]
    const page = await browser.newPage()

    await page.on('load', async () => {
        console.log('Loaded: ' + page.url())
        await downloadCSV_(page)
        await page.waitForTimeout(2000)
        await page.close()
    })

    if (close_on_completion) {
        browser.on('targetdestroyed', async () => {
            if ((await browser.pages()).length === 1) {
                try {
                    await initPage.waitForTimeout(2000)
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
        timeout: NETWORK_IDLE_DELAY ? NETWORK_IDLE_DELAY : 30000,
        waitUntil: 'networkidle0',
    });
    console.log('Navigation achieved.')
    // await page.waitForTimeout(D2CHECKLIST_LOAD_DELAY)
    // await page.waitForSelector('.ng-fa-icon.accent-text.ng-star-inserted')
    console.log('Selector achieved.')
    let button = await page.$('.mat-focus-indicator.mat-stroked-button.mat-button-base')
    console.log('Button found.');
    await page.waitForTimeout(D2CHECKLIST_LOAD_DELAY - NETWORK_IDLE_DELAY)
    await button.click()
    console.log('Button clicked.')
    return button
}

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

const importCsvUsingGApi = async (auth, values) => {
    if (!values && !VALUES) return console.error('Values is empty:', values)
    if (!values) values = VALUES

    const sheets = google.sheets({version: 'v4', auth})
    console.log('Updating spreadsheet...')
    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
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
        const responses = res.data.responses
        if (responses){
            console.log('Response: Updated range is ' + responses[0]['updatedRange'])
        } else {
            console.log('No response received.')
        }
    });
    
}

const sortByColumnUsingGApi = async (auth, sortColumn, ascending) => {
    if (!sortColumn && !SORTCOLUMN) return console.error('Sort column is empty:', sortColumn)
    if (!sortColumn) sortColumn = SORTCOLUMN
    if (ascending === undefined) ascending = false

    // "sortRange": {
    //     "range": {
    //         "sheetId": sheetId,
    //             "startRowIndex": 0,
    //             "endRowIndex": 10,
    //             "startColumnIndex": 0,
    //             "endColumnIndex": 6
    //     },
    //     "sortSpecs": [
    //         {
    //             "dimensionIndex": 1,
    //             "sortOrder": "ASCENDING"
    //         },
    //         {
    //             "dimensionIndex": 3,
    //             "sortOrder": "DESCENDING"
    //         },
    //         {
    //             "dimensionIndex": 4,
    //             "sortOrder": "DESCENDING"
    //         }

    const sheets = google.sheets({version: 'v4', auth})
    const columnLabel = String.fromCharCode(Math.floor(sortColumn / 26) + 64) + String.fromCharCode(Math.floor(sortColumn % 26) + 65)
    console.log('Sorting spreadsheet by column: ' + columnLabel + '...')
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
            "requests": [{
                "sortRange": {
                    "range": {
                        "sheetId": SHEET_ID,
                        "startRowIndex": 0,
                        "endRowIndex": 101,
                        "startColumnIndex": 0,
                        "endColumnIndex": sortColumn + 1
                    },
                    "sortSpecs": [{
                        "dimensionIndex": sortColumn,
                        "sortOrder": "DESCENDING"
                    }]
                }
            }]
        }
    }, (err, res) => {
        if (err) return console.error('The API returned an error: ' + err)
        // console.log(res)
        const replies = res.data.replies
        if (replies){
            Object.entries(replies[0]).forEach(([key, value]) => {
                console.log(key + ' - ' + JSON.stringify(value, null, 4)) // key - value
            })
        } else {
            console.log('No reply received.')
        }
    });
}

const parseCsvIntoValues = async (filepath) => {
    let csv_content;
    try {
        csv_content = await fs_promises.readFile(filepath)
        global.VALUES = await parseCsvContentIntoValues(csv_content.toString())
        markCsvUsed(filepath)
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

const markCsvUsed = (filePath) => {
    pathObj = pth.parse(filePath)
    // bak = pathObj.dir + '\\\\' + pathObj.name + '_used' + pathObj.ext; // for windows machines
    bak = pathObj.dir + '/' + pathObj.name + '_used' + pathObj.ext; // for macos and linux machines
    if (fs.existsSync(bak)) {
        i = 0
        // while (fs.existsSync(bak = pathObj.dir + '\\\\' + pathObj.name + '_used' + i + pathObj.ext)) {i++} // for windows machines
        while (fs.existsSync(bak = pathObj.dir + '/' + pathObj.name + '_used' + i + pathObj.ext)) {i++} // for macos and linux machines
    }
    fs_promises.rename(filePath, bak)
}

const computeDelay = () => {
    const MINUTES_EARLY = 15;
    var now = new Date();
    var then = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
    var diff = then.getTime() - now.getTime() - (MINUTES_EARLY * 60 * 1000);
    // var now = new Date(), 
    //     then = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
    //     diff = then.getTime() - now.getTime() - (MINUTES_EARLY * 60 * 1000);
    return diff;
}

const main = async () => {

    global.SCHEDULE_SECOND_UPDATE = false;

    // If modifying these scopes, delete token.json.
    global.SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
    
    // The file token.json stores the user's access and refresh tokens, and is
    // created automatically when the authorization flow completes for the first
    // time.
    global.TOKEN_PATH = 'token.json';

    global.NETWORK_IDLE_DELAY = 100000;

    global.D2CHECKLIST_LOAD_DELAY = NETWORK_IDLE_DELAY + 100000; // in ms

    let boop_number = 3063489;

    global.SPREADSHEET_ID = '1oWFPCrHyKy5kzQdteDj5NrUJBQ9OEGDCfeNX_9BT2iQ';

    global.SHEET_ID = 1266473862;

    let today_date = new Date().toISOString().replace(/T.+/, '');
    // let file_path = `C:/Users/vinay/Downloads/clan-progress-${today_date}.csv`; // default file path for windows machines
    let file_path = `${os.homedir()}/Downloads/clan-progress-${today_date}.csv`; // default filepath for macos and linux machines

    // TODO: implement Grab csv data from webpage directly, bypassing file watch, after clicking download button
    if (!fs.existsSync(file_path)) {
        let browser = await puppeteer.launch({headless: false});
        await downloadCSV(boop_number, true, browser).then(() => console.log('Browser launched.')) // should be "Download finished.", but is not logged in correct order, so changed for accuracy temporarily

        startWaiting(file_path, parseCsvIntoValues, D2CHECKLIST_LOAD_DELAY + 20000)
    } else {
        console.log('Skipping CSV download.')
        await parseCsvIntoValues(file_path)
        global.D2CHECKLIST_LOAD_DELAY = 10000
    }

    setTimeout(fs.readFile, D2CHECKLIST_LOAD_DELAY + 25000, 'credentials.json', (err, content) => {
        if (err) return console.error('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), importCsvUsingGApi);
    });

    global.SORTCOLUMN = 82

    setTimeout(fs.readFile, D2CHECKLIST_LOAD_DELAY + 35000, 'credentials.json', (err, content) => {
        if (err) return console.error('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), sortByColumnUsingGApi);
    });

    

}

main().then(() => console.log('Main finished.'))

if (SCHEDULE_SECOND_UPDATE) {
    const delay = computeDelay()
    console.log(`Delaying second run for ${delay} seconds...`);
    setTimeout(async () => main().then(() => console.log('Delayed main finished.')), delay);
}