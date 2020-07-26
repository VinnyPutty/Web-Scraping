const puppeteer = require('puppeteer');
const navigator = require('puppeteer-navigator');
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const downloadCSV = async (clan_number) => {

    const browser = await puppeteer.launch( { headless: false });
    // const page = await browser.newPage();
    // const page = navigator.makePageNavigator(await browser.newPage());
    const page = await browser.newPage()

    page.on('load', async () => {
        console.log('Loaded: ' + page.url())
        await downloadCSV_(page)
    })

    await page.goto(`https://www.d2checklist.com/clan/${clan_number}/info`);

    // await page.wait(15000)

    // let button = await page.$('.mat-focus-indicator.mat-stroked-button.mat-button-base button')

    // let button = ''
    // await page.evaluate(
    //     () => button = document.querySelector('.mat-focus-indicator.mat-stroked-button.mat-button-base button').textContent
    // )

    // console.log(button)

    // await page.wait(2000);
    //
    // await page.wait('.d-md-inline.mat-button');
    //
    // await page.wait(5000);
    //
    // await page.click('.d-md-inline.mat-button');
    //
    // await page.wait(1000);

    // body > d2c-root > div > mat-sidenav-container > mat-sidenav-content > div.wrapper > d2c-clan-history > div > div.childVert > div.main.ng-star-inserted > div > d2c-clan-info > div > div.section.ng-star-inserted > div > div:nth-child(2) > div > button

    // /html/body/d2c-root/div/mat-sidenav-container/mat-sidenav-content/div[1]/d2c-clan-history/div/div[1]/div[1]/div/d2c-clan-info/div/div[1]/div/div[2]/div/button

    // <button _ngcontent-rhg-c247="" mat-stroked-button="" class="mat-focus-indicator mat-stroked-button mat-button-base"><span class="mat-button-wrapper"><fa-icon _ngcontent-rhg-c247="" class="ng-fa-icon" hidden=""><svg role="img" aria-hidden="true" focusable="false" data-prefix="far" data-icon="spinner" class="svg-inline--fa fa-spinner fa-w-16 fa-pulse fa-fw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M296 48c0 22.091-17.909 40-40 40s-40-17.909-40-40 17.909-40 40-40 40 17.909 40 40zm-40 376c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zm248-168c0-22.091-17.909-40-40-40s-40 17.909-40 40 17.909 40 40 40 40-17.909 40-40zm-416 0c0-22.091-17.909-40-40-40S8 233.909 8 256s17.909 40 40 40 40-17.909 40-40zm20.922-187.078c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40c0-22.092-17.909-40-40-40zm294.156 294.156c-22.091 0-40 17.909-40 40s17.909 40 40 40c22.092 0 40-17.909 40-40s-17.908-40-40-40zm-294.156 0c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40z"></path></svg></fa-icon><fa-icon _ngcontent-rhg-c247="" class="ng-fa-icon"><svg role="img" aria-hidden="true" focusable="false" data-prefix="fal" data-icon="download" class="svg-inline--fa fa-download fa-w-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M452 432c0 11-9 20-20 20s-20-9-20-20 9-20 20-20 20 9 20 20zm-84-20c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm144-48v104c0 24.3-19.7 44-44 44H44c-24.3 0-44-19.7-44-44V364c0-24.3 19.7-44 44-44h99.4L87 263.6c-25.2-25.2-7.3-68.3 28.3-68.3H168V40c0-22.1 17.9-40 40-40h96c22.1 0 40 17.9 40 40v155.3h52.7c35.6 0 53.4 43.1 28.3 68.3L368.6 320H468c24.3 0 44 19.7 44 44zm-261.7 17.7c3.1 3.1 8.2 3.1 11.3 0L402.3 241c5-5 1.5-13.7-5.7-13.7H312V40c0-4.4-3.6-8-8-8h-96c-4.4 0-8 3.6-8 8v187.3h-84.7c-7.1 0-10.7 8.6-5.7 13.7l140.7 140.7zM480 364c0-6.6-5.4-12-12-12H336.6l-52.3 52.3c-15.6 15.6-41 15.6-56.6 0L175.4 352H44c-6.6 0-12 5.4-12 12v104c0 6.6 5.4 12 12 12h424c6.6 0 12-5.4 12-12V364z"></path></svg></fa-icon> Download CSV Report</span><div matripple="" class="mat-ripple mat-button-ripple"></div><div class="mat-button-focus-overlay"></div></button>

    // await page.evaluate(() => {
    //     [...document.querySelector('.mat-focus-indicator.mat-stroked-button.mat-button-base button')][0].click();
    // });

    // await page.screenshot({path: 'screenshots/3.png'});

    // await page.wait(1000)
    // console.log('Closing browser.')
    // await browser.close();
};

const downloadCSV_ = async (page) => {
    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });
    console.log('Navigation achieved.')
    // <fa-icon _ngcontent-sll-c247="" class="ng-fa-icon accent-text mat-option.mat-selected ng-star-inserted"><svg role="img" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="check-square" class="svg-inline--fa fa-check-square fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M400 480H48c-26.51 0-48-21.49-48-48V80c0-26.51 21.49-48 48-48h352c26.51 0 48 21.49 48 48v352c0 26.51-21.49 48-48 48zm-204.686-98.059l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.248-16.379-6.249-22.628 0L184 302.745l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.25 16.379 6.25 22.628.001z"></path></svg></fa-icon>
    await page.waitForSelector('.ng-fa-icon.accent-text.ng-star-inserted')
    console.log('Selector achieved.')
    let button = await page.$('.mat-focus-indicator.mat-stroked-button.mat-button-base')
    await button.click()
    // let button = ''
    // await page.evaluate(() => {
    //         // button = document.querySelector('.mat-focus-indicator.mat-stroked-button.mat-button-base').textContent
    //         // return document.querySelector('.mat-focus-indicator.mat-stroked-button.mat-button-base').click()
    //     }
    // )

    console.log(button)
    return button
}

let boop_number = 3063489
downloadCSV(boop_number);