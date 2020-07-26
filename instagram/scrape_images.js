const puppeteer = require('puppeteer');
const fs = require('fs')

const scrapeImages = async (username) => {
    const browser = await puppeteer.launch( { headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.instagram.com/accounts/login/');

    // Acquire login details

    var login_info = {username: '???', password: 'missingno'};

    fs.readFile('secret.props', 'utf8', function (error, data) {
        console.log(data)
        // login_info.username = data.username;
        // login_info.password = data.password;
    })



    // Login form
    await page.screenshot({path: 'screenshots/1.png'});

    await page.type('[name=username]', 'fireship_dev');

    await page.type('[name=password]', 'some-pa$$word');

    await page.screenshot({path: 'screenshots/2.png'});

    await page.click('[type=submit]');

    // Social Page

    await page.waitFor(5000);

    await page.goto(`https://www.instagram.com/${username}`);

    await page.waitForSelector('img ', {
        visible: true,
    });


    await page.screenshot({path: 'screenshots/3.png'});


    // Execute code in the DOM
    const data = await page.evaluate( () => {

        const images = document.querySelectorAll('img');

        const urls = Array.from(images).map(v => v.src);

        return urls
    });



    await browser.close();

    console.log(data);

    return data;
};

scrapeImages('')