const puppeteer = require('puppeteer')
const sillyname = require('sillyname')
const password = require('generate-password')
const fetch = require('node-fetch')
const FormData = require('form-data')
const fs = require('fs')

module.exports = async function() {
    const start = new Date()

    const browser = await puppeteer.launch()

    // generate mail
    const res = await fetch('https://tempail.com/')
    const [, phpsessid, oturum] = /PHPSESSID=([a-zA-Z\d]+); path=\/, oturum=([a-zA-Z\d]+)/.exec(res.headers.get('set-cookie'))
    const text = await res.text()
    const email = /<input id="eposta_adres" type="text" class="adres-input" value="(.+@.+\..+)" data-clipboard-text=/.exec(text)[1]

    // create mega account
    const mega = await browser.newPage()
    await mega.goto('https://mega.nz/register')

    await mega.waitForSelector('#register-firstname')

    const [first, last] = sillyname().split(' ')
    const pw = password.generate({ length: 12, numbers: true, uppercase: true });
    console.log(first, last)
    console.log(email + ':' + pw)

    await (await mega.$('#register-firstname')).type(first)
    await (await mega.$('#register-lastname')).type(last)
    await (await mega.$('#register-email')).type(email)
    await (await mega.$('#register-password')).type(pw)
    await (await mega.$('#register-password2')).type(pw)

    await (await mega.$('.register-check')).click()
    await (await mega.$('.register-st2-button')).click()

    console.log('oturum=' + oturum, 'PHPSESSID=' + phpsessid)

    // get email
    const mailid = await new Promise(resolve => {

        let interval
        const fn = async () => {
            const form = new FormData();
            form.append('oturum', oturum);

            const inbox = await fetch('https://tempail.com/en/api/kontrol/', {
                method: 'POST', body: form, headers: { cookie: 'PHPSESSID=' + phpsessid }
            }).then(res => res.text())

            const res = /<li class="mail " id="mail_(\d+)">/.exec(inbox);


            if (res) {
                clearInterval(interval)
                resolve(res[1])
            } else {
                console.log('mail not found, retrying in 1s')
            }
        }

        console.log('fetching inbox...')

        interval = setInterval(fn, 1000)
    });

    console.log('mail found, id = ' + mailid)

    // get mega link
    const mail = await fetch(`https://tempail.com/en/api/icerik/?oturum=${oturum}&mail_no=${mailid}`, {
        headers: { cookie: 'PHPSESSID=' + phpsessid }
    }).then(res => res.text())

    const link = /href="(https:\/\/mega\.nz\/#confirm[a-zA-Z\d_-]+)"/.exec(mail)[1]

    console.log(link)

    // use mega link
    await mega.goto(link)
    await mega.waitForSelector('#login-password2')

    await (await mega.$('#login-password2')).type(pw)
    await (await mega.$('.register-st2-button')).click()

    // append to file

    fs.appendFileSync('accounts.txt', email + ':' + pw + '\n');

    console.log('done in ' + (new Date().getTime() - start.getTime() + 'ms'))

    // wait for mega...
    await mega.waitForSelector('.big-header')

    await browser.close()
}
