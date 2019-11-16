// Packages
const FileCookieStore = require('tough-cookie-filestore2')
const Instagram = require('../lib')
const credentials = require('../test/credentials.json')

const cookieStore = new FileCookieStore('./test/cookies.json')
const client = new Instagram({ ...credentials, cookieStore })

;(async () => {
  await client.login()
  const profile = await client.getProfile()

  console.log(profile)
})()
