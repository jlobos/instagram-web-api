<h1 align="center">
  <img width="72px" src="https://firebasestorage.googleapis.com/v0/b/random-storage-332ce.appspot.com/o/instagram.svg?alt=media&token=5fe11096-daee-43c1-8d5f-8a77c9f46485">
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/instagram-web-api"><img alt="NPM version" src="https://badge.fury.io/js/instagram-web-api.svg"></a>
  <a href="https://circleci.com/gh/jlobos/instagram-web-api"><img alt="Build Status" src="https://circleci.com/gh/jlobos/instagram-web-api.svg?style=shield"></a>
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

Save cookies to disk by using a `though-cookie` store.

```js
// Packages
const Instagram = require('instagram-web-api')
const FileCookieStore = require('tough-cookie-filestore2')

const { username, password } = process.env // Only required when no cookies are stored yet

const cookieStore = new FileCookieStore('./cookies.json')
const client = new Instagram({ username, password, cookieStore })

;(async () => {
  // URL or path of photo
  const photo =
    'https://scontent-scl1-1.cdninstagram.com/t51.2885-15/e35/22430378_307692683052790_5667315385519570944_n.jpg'

  await client.login()

  // Upload Photo to feed or story, just configure 'post' to 'feed' or 'story'
  const { media } = await client.uploadPhoto({ photo: photo, caption: 'testing', post: 'feed' })
  console.log(`https://www.instagram.com/p/${media.code}/`)
})()
```

## API Reference

* [Instagram](#instagramcredentials-opts)
  * [new Instagram({ username, password, cookieStore }, { language, proxy, requestOptions })](#instagramcredentials-opts)
  * [.login({ username, password })](#logincredentials)
  * [.logout()](#logout)
  * [.getHome()](#gethome)
  * [.getUserByUsername({ username })](#getuserbyusernameparams)
  * [.getFollowers({ userId, first, after })](#getfollowersparams)
  * [.getFollowings({ userId, first, after })](#getfollowingsparams)
  * [.getActivity()](#getactivity)
  * [.getProfile()](#getprofile)
  * [.updateProfile({ name, email, username, phoneNumber, gender, biography, website, similarAccountSuggestions })](#updateprofileparams)
  * [.changeProfilePhoto({ photo })](#changeprofilephotoparams)
  * [.deleteMedia({ mediaId })](#deletemediaparams)
  * [.uploadPhoto({ photo, caption, post })](#uploadphotoparams)
  * [.getMediaFeedByLocation({ locationId })](#getmediafeedbylocationparams)
  * [.getMediaFeedByHashtag({ hashtag })](#getmediafeedbyhashtagparams)
  * [.locationSearch({ query, latitude, longitude })](#locationsearchparams)
  * [.getMediaByShortcode({ shortcode })](#getmediabyshortcodeparams)
  * [.addComment({ mediaId, text })](#addcommentparams)
  * [.deleteComment({ mediaId, commentId })](#deletecommentparams)
  * [.getChallenge({ challengeUrl })](#getchallengeparams)
  * [.updateChallenge({ challengeUrl, choice, securityCode })](#updatechallengeparams)
  * [.resetChallenge({ challengeUrl })](#resetchallengeparams)
  * [.replayChallenge({ challengeUrl })](#replaychallengeparams)
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
  * [.getPhotosByHashtag({hashtag, first, after})](#gethastagphotosparams)
  * [.getPhotosByUsername({username, first, after})](#getphotosbyusernameparams)
  * [.getPrivateProfilesFollowRequests(cursor)](#getPrivateProfilesFollowRequests)
  * [.getChainsData({ userId })](#getChainsData)
  * [.getMediaLikes({ shortcode, first, after })](#getMediaLikesParams)
  * [.getMediaComments({ shortcode, first, after })](#getMediaCommentsParams)

### Instagram(credentials, opts)
```js
const client = new Instagram({ username: '', password: '' }, { language: 'es-CL' })
```
> Initializes the client.
- `credentials`
  - `username`: The username of account
  - `password`: The password of account
  - `cookieStore`: An optional [`though-cookie`](https://www.npmjs.com/package/tough-cookie) cookie storage, which allows for persistent cookies. Default is `undefined`
- `opts`
  - `language`: The language of response from API. Default is `en-US`
  - `proxy`: `String` of a proxy to tunnel all requests. Default is `undefined` 

### login(credentials)
```js
const { username, password, cookies } = await client.login({ username: '', password: '' })
const { authenticated, user } = await client.login({ username: '', password: '' })
```

> Login in the account, this method returns `user` (`true` when username is valid) and `authenticated` (`true` when login was successful)
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
const feed = await client.getHome('KGEAxpEdUwUrxxoJvxRoQeXFGooSlADHZ8UaDdSWbnOIxxoUUhyciJ7EGlxNlZjaYcUaXTgUM00qyBrgBhUsLezIGqVTlxqausga5W-fVax9xRryaBdN1EnIGvdQFgzxoMgaFoLO7v7xWQA=')
```
> Get home feed timeline, media shared by the people you follow.
- `params`
  - `end_cursor` (`String`) for pagination

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
await client.uploadPhoto({ photo, caption: '❤️', post: 'feed' })
```
> Upload a photo to Instagram. Only jpeg images allowed.
- `params`
  - `photo`: A `String` of path file or URL
  - `caption`: The caption of photo. Default is ` `
  - `post`: The local post, `feed` or `story`

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
> Search venues by latitude and longitude.
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
  - `replyToCommentId`: Optional comment id to which to reply

### deleteComment(params)
```js
await client.deleteComment({ mediaId: '1442533050805297981', commentId: '17848908229146688' })
```
> Delete a comment.
- `params`
  - `mediaId`: The media id
  - `commentId`: The comment id

### getChallenge(params)
```js
await client.getChallenge({ challengeUrl: '/challenge/1284161654/a1B2c3d4E6/' })
```
> Get information about a challenge.
- `params`
  - `challengeUrl`: A `String` with a challenge path

### updateChallenge(params)
```js
const challengeUrl = '/challenge/1284161654/a1B2c3d4E6/'

await client.updateChallenge({ challengeUrl, choice: 0 })
await client.updateChallenge({ challengeUrl, securityCode: 123456  })
```
> Request or submit a verification code for the given challenge.
- `params`
  - `challengeUrl`: A `String` with a challenge path
  - `choice`: `Number` `0` for phone and `1` for email. Default is ``
  - `securityCode`: `Number` the received verification code for the challenge. Default is ``

### resetChallenge(params)
```js
await client.resetChallenge({ challengeUrl: '/challenge/1284161654/a1B2c3d4E6/' })
```
> Reset a challenge to start over again.
- `params`
  - `challengeUrl`: A `String` with a challenge path

### replayChallenge(params)
```js
await client.replayChallenge({ challengeUrl: '/challenge/1284161654/a1B2c3d4E6/' })
```
> Request a new verification message.
- `params`
  - `challengeUrl`: A `String` with a challenge path

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
  
  
  
### getPhotosByHashtag(params)
```js
await client.getPhotosByHashtag({ hashtag: 'unicorn' })
```
> Get photos for hashtag.
- `params`
  - `hashtag`: A `String` with a hashtag
  - `first`:  A `number` of records to return
  - `after`: The query cursor `String` for pagination
  
### getPhotosByUsername(params)
  ```js
  await client.getPhotosByUsername({ username: 'unicorn' })
  ```
  > Gets user photos.
  - `params`
    - `username`: A `String` with a hashtag
    - `first`:  A `number` of records to return
    - `after`: The query cursor `String` for pagination

### getPrivateProfilesFollowRequests
  ```js
  await client.getPrivateProfilesFollowRequests(cursor)
  ```

### getChainsData
  ```js
  await client.getChainsData({ userId })
  ```
  > This will return the similar accounts, that you see, when you click on the ARROW in a profile.
- `params`
  - `userId`: The user id
  
### getMediaLikes(params)
  ```js
  await client.getMediaLikes({ shortcode: 'B-0000000', first: '49', after: '' })
  ```
  > This will return the media likes.
  - `params`
    - `shortcode`: The shortcode media like this: https://www.instagram.com/p/B-00000000/, only put shortcode like this : B-000000000
    - `first`:  A `number` of records to return max is `49`
    - `after`: The query cursor `String` for pagination

### getMediaComments(params)
  ```js
  await client.getMediaComments({ shortcode: 'B-0000000', first: '12', after: '' }).catch((error) => {
    console.log(error);
  })
  .then((response) => {
    console.log(response);
  });
  
  //The query cursor 'after' maybe return an array, if array you need to convert like this: 
  let pointer = response.page_info.end_cursor;
  // this will try to convert array to json stringify
	try{
			pointer = JSON.parse(pointer);
			pointer = JSON.stringify(pointer);
	}catch(e){
			console.log('Pointer is not array!, don't need to be converted!');
	}
  
  ```
  > This will return the media comments.
  - `params`
    - `shortcode`: The shortcode media like this: https://www.instagram.com/p/B-00000000/, only put shortcode like this : B-000000000
    - `first`:  A `number` of records to return max is `49`
    - `after`: The query cursor `String` for pagination

## License

MIT © [Jesús Lobos](https://jlobos.com/)
