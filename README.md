<h1 align="center">
  <img width="72px" src="https://firebasestorage.googleapis.com/v0/b/random-storage-332ce.appspot.com/o/instagram.svg?alt=media&token=5fe11096-daee-43c1-8d5f-8a77c9f46485">
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/instagram-web-api"><img alt="NPM version" src="https://badge.fury.io/js/instagram-web-api.svg"></a>
  <a href="https://travis-ci.org/jlobos/instagram-web-api"><img alt="Build Status" src="https://travis-ci.org/jlobos/instagram-web-api.svg?branch=master"></a>
  <a href="https://github.com/sindresorhus/xo"><img alt="XO code style" src="https://img.shields.io/badge/code_style-XO-5ed9c7.svg"></a>
</p>

### A Instagram Private Web API client 🤳✨❤️

Simple, easy and very complete implementation of the Instagram private web API.

- Support for all the main functions of [Instagram Web](https://www.instagram.com/)
- Well tested, CI
- All test runs daily

## Install

```bash
npm install instagram-web-api
```

## Usage

Intance `Instagram` and call `login` method; this stores the credentials in memory.

```js
const Instagram = require('instagram-web-api')
const { username, password } = process.env

const client = new Instagram({ username, password })

client
  .login()
  .then(() => {
    client
      .getProfile()
      .then(console.log)
  })
```

Using `async`/`await` in Node >= 8

```js
const Instagram = require('instagram-web-api')
const { username, password } = process.env

const client = new Instagram({ username, password })

;(async () => {
  await client.login()
  const profile = await client.getProfile()

  console.log(profile)
})()
```

Save credentials to disk. The method `login` resolve an `Object` with credentials, this allows you to save in disk or any database:

```js
// Native
const { existsSync } = require('fs')
const { join: joinPath } = require('path')

// Packages
const Instagram = require('instagram-web-api')
const loadJSON = require('load-json-file')
const writeJSON = require('write-json-file')

const credentialsFile = joinPath(__dirname, 'credentials.json')

;(async () => {
  let client

  if (existsSync(credentialsFile)) {
    client = new Instagram(await loadJSON(credentialsFile))
  } else {
    const { username, password } = process.env
    client = new Instagram({ username, password })

    const credentials = await client.login()
    await writeJSON(credentialsFile, credentials)
  }

  // URL or path of photo
  const photo = 'https://scontent-scl1-1.cdninstagram.com/t51.2885-15/e35/22430378_307692683052790_5667315385519570944_n.jpg'

  // Upload Photo
  const { media } = await client.uploadPhoto(photo)
  console.log(`https://www.instagram.com/p/${media.code}/`)
})()
```

## API Reference

* [Instagram](#instagramcredentials-opts)
  * [new Instagram({ username, password, cookies, cookieStore }, { language, proxy })](#instagramcredentials-opts)
  * [.login({ username, password })](#logincredentials)
  * [.logout()](#logout)
  * [.getHome()](#gethome)
  * [.getUserByUsername({ username })](#getuserbyusernameparams)
  * [.getFollowers({ userId, first, after })](#getfollowers)
  * [.getFollowings({ userId, first, after })](#getfollowings)
  * [.getActivity()](#getactivity)
  * [.getProfile()](#getprofile)
  * [.updateProfile({ name, email, username, phoneNumber, gender, biography, website, similarAccountSuggestions })](#updateprofileparams)
  * [.changeProfilePhoto({ photo })](#changeprofilephotoparams)
  * [.deleteMedia({ mediaId })](#deletemediaparams)
  * [.uploadPhoto({ photo, caption })](#uploadphotoparams)
  * [.uploadStory({ photo, caption })](#uploadstoryparams)
  * [.getMediaFeedByLocation({ locationId })](#getmediafeedbylocationparams)
  * [.getMediaFeedByHashtag({ hashtag })](#getmediafeedbyhashtagparams)
  * [.locationSearch({ query, latitude, longitude })](#locationsearchparams)
  * [.getMediaByShortcode({ shortcode })](#getmediabyshortcodeparams)
  * [.addComment({ mediaId, text })](#addcommentparams)
  * [.deleteComment({ mediaId, commentId })](#deletecommentparams)
  * [.approve({ userId })](#approveparams)
  * [.ignore({ userId })](#ignoreparams)
  * [.follow({ userId })](#followparams)
  * [.unfollow({ userId })](#unfollowparams)
  * [.block({ userId })](#blockparams)
  * [.unblock({ userId })](#unblockparams)
  * [.like({ mediaId })](#likeparams)
  * [.unlike({ mediaId })](#unlikeparams)
  * [.save({ mediaId })](#saveparams)
  * [.unsave({ mediaId })](#unsaveparams)
  * [.search({ query, context })](#searchparams)

### Instagram(credentials, opts)
```js
const client = new Instagram({ username: '', password: '' }, { language: 'es-CL' })
```
> Initializes the client.
- `credentials`
  - `username`: The username of account
  - `password`: The password of account
  - `cookies`: An optional `Array` of cookies, only needed for restore session. Default is `undefined`
  - `cookieStore`: An optional [`though-cookie`](https://www.npmjs.com/package/tough-cookie) cookie storage, which allows for persistent cookies. Default is `undefined`
- `opts`
  - `language`: The language of response from API. Default is `en-US`
  - `proxy`: `String` of a proxy to tunnel all requests. Default is `undefined` 

### login(credentials)
```js
const { username, password, cookies } = await client.login({ username: '', password: '' })
```
> Login in the account, this method return an object with the credentials (username, password and cookies) for saving the session.
- `credentials`
  - `username`: The username of account
  - `password`: The password of account

### logout()
```js
await client.logout()
```
> Logout in the account.

### getHome()
```js
const feed = await client.getHome()
```
> Get home feed timeline, media shared by the people you follow.

### getUserByUsername(params)
```js
const instagram = await client.getUserByUsername({ username: 'instagram' })
const me = await client.getUserByUsername({ username: client.credentials.username })
```
> Get user by username, this method not require authentication for public profiles.
- `params`
  - `username`: The username of the profile

### getFollowers(params)
```js
const followers = await client.getFollowers({ userId: '1284161654' })
```
> Get followers for given userId. Be aware that the response gets slightly altered for easier usage.
- `params`
  - `userId`: The user id
  - `first`: Amount of followers to request. Default is `20`
  - `after`: Optional `end_cursor` (`String`) for pagination.

### getFollowings(params)
```js
const followings = await client.getFollowings({ userId: '1284161654' })
```
> Get followings for given userId. Be aware that the response gets slightly altered for easier usage.
- `params`
  - `userId`: The user id
  - `first`: Amount of followings to request. Default is `20`
  - `after`: Optional `end_cursor` (`String`) for pagination. 

### getActivity()
```js
const activity = await client.getActivity()
```
> Get activity of account, news following, liked, etc.

### getProfile()
```js
const profile = await client.getProfile()
```
> Get profile the account `first_name`, `last_name`, `email`, `username`, `phone_number`, `gender`, `birthday`, `biography`, `external_url` and `chaining_enabled`.

### updateProfile(params)
```js
await client.updateProfile({ biography: '❤️', website: 'https://jlobos.com/', gender: 1 })
```
> Update profile the account.
- `params`
  - `name`: The full name. Default is ` `
  - `email`: The email of account. Default is ` `
  - `username`: The username of account. Default is `client.credentials.username`
  - `phoneNumber`: The Phone Number. Default is ` `
  - `gender`: `Number` `1` male, `2` female and `3` not specified
  - `biography`: The Bio. Default is ` `
  - `website`: The Website. Default is ` `
  - `similarAccountSuggestions`: `Boolean` Include your account when recommending similar accounts people might want to follow. Default is `true`

### changeProfilePhoto(params)
```js
const fs = require('fs')

const photo = fs.join(__dirname, 'photo.jpg')
await client.changeProfilePhoto({ photo })
```
> Change the profile photo.
- `params`
  - `photo`: A `String` of path file or URL

### deleteMedia(params)
```js
await client.deleteMedia({ mediaId: '1442533050805297981' })
```
> Delete a media, photo, video, etc. by the id.
- `params`
  - `mediaId`: The media id

### uploadPhoto(params)
```js
const photo = 'https://scontent-scl1-1.cdninstagram.com/t51.2885-15/e35/16465198_658888867648924_4042368904838774784_n.jpg'
await client.uploadPhoto({ photo, caption: '❤️' })
```
> Upload a photo to Instagram.
- `params`
  - `photo`: A `String` of path file or URL
  - `caption`: The caption of photo. Default is ` `

### uploadStory(params)
```js
const photo = 'https://scontent-scl1-1.cdninstagram.com/t51.2885-15/e35/16465198_658888867648924_4042368904838774784_n.jpg'
await client.uploadStory({ photo })
```
> Upload a story to Instagram, it only work for images (`jpg`)
- `params`
  - `photo`: A `String` of path file or URL
  - `caption`: The caption of photo. Default is ` `

### getMediaFeedByLocation(params)
```js
const location = await client.getMediaFeedByLocation({ locationId: '26914683' })
```
> Get latitude, longitude, top posts, last media, country, city, and more related to the location.
- `params`
  - `locationId`: The location id

### getMediaFeedByHashtag(params)
```js
const tag = client.getMediaFeedByHashtag({ hashtag: 'unicorn' })
```
> Explore last media and top posts feed related to a hashtag.
- `params`
  - `hashtag`: A hashtag, not including the "#"

### locationSearch(params)
```js
const venues = client.locationSearch({ query: 'chile', latitude: -33.45, longitude: -70.6667 })
```
> Search vanues by latitude and longitude.
- `params`
  - `latitude`: Latitude
  - `longitude`: Longitude
  - `query`: A optional location name. Default is ` `

### getMediaByShortcode(params)
```js
const media = await client.getMediaByShortcode({ shortcode: 'BQE6Cq2AqM9' })
```
> Get data of a media by the Instagram shortcode
- `params`
  - `shortcode`: A shortcode

### addComment(params)
```js
await client.addComment({ mediaId: 1442533050805297981, text: 'awesome' })
```
> Add comment to a media item.
- `params`
  - `mediaId`: The media id
  - `text`: Comment text

### deleteComment(params)
```js
await client.deleteComment({ mediaId: '1442533050805297981', commentId: '17848908229146688' })
```
> Delete a comment.
- `params`
  - `mediaId`: The media id
  - `commentId`: The comment id

### approve(params)
```js
await client.approve({ userId: '1284161654' })
```
> Approve a friendship request.
- `params`
  - `userId`: The user id

### ignore(params)
```js
await client.ignore({ userId: '1284161654' })
```
> Reject a friendship request.
- `params`
  - `userId`: The user id

### follow(params)
```js
await client.follow({ userId: '1284161654' })
```
> Follow a user.
- `params`
  - `userId`: The user id

### unfollow(params)
```js
await client.unfollow({ userId: '1284161654' })
```
> Unfollow a user.
- `params`
  - `userId`: The user id

### block(params)
```js
await client.block({ userId: '1284161654' })
```
> Block a user.
- `params`
  - `userId`: The user id

### unblock(params)
```js
await client.unblock({ userId: '1284161654' })
```
> Unblock a user.
- `params`
  - `userId`: The user id

### like(params)
```js
await client.like({ mediaId: '1442533050805297981' })
```
> Like a media item.
- `params`
  - `mediaId`: The media id

### unlike(params)
```js
await client.unlike({ mediaId: '1442533050805297981' })
```
> Unlike a media item.
- `params`
  - `mediaId`: The media id

### save(params)
```js
await client.save({ mediaId: '1442533050805297981' })
```
> Save a media item.
- `params`
  - `mediaId`: The media id

### unsave(params)
```js
await client.unsave({ mediaId: '1442533050805297981' })
```
> Unsave a media item.
- `params`
  - `mediaId`: The media id

### search(params)
```js
await client.search({ query: 'unicorn' })
```
> Search users, places, or hashtags.
- `params`
  - `query`: Query
  - `context`: The context of search, `hashtag`, `place`, `user` or `blended`. Default is `blended`

## License

MIT © [Jesús Lobos](https://jlobos.com/)
