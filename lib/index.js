// Native
const fs = require('fs')
const crypto = require('crypto')

// Packages
const request = require('request-promise-native')
const { Cookie } = require('tough-cookie')
const isUrl = require('is-url')
const useragentFromSeed = require('useragent-from-seed')

const baseUrl = 'https://www.instagram.com'

class Instagram {
  constructor(
    { username, password, cookieStore },
    { language, proxy, requestOptions } = {}
  ) {
    this.credentials = {
      username,
      password
    }

    const jar = request.jar(cookieStore)
    jar.setCookie(request.cookie('ig_cb=1'), baseUrl)
    const { value: csrftoken } =
      jar.getCookies(baseUrl).find(({ key }) => key === 'csrftoken') || {}

    const userAgent = useragentFromSeed(username)
    if (requestOptions === undefined) {
      requestOptions = {}
    }
    requestOptions.baseUrl = baseUrl
    requestOptions.uri = ''
    requestOptions.headers = {
      'User-Agent': userAgent,
      'Accept-Language': language || 'en-US',
      'X-Instagram-AJAX': 1,
      'X-CSRFToken': csrftoken,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: baseUrl
    }
    requestOptions.proxy = proxy
    requestOptions.jar = jar
    requestOptions.json = true
    this.request = request.defaults(requestOptions)
  }

  async login({ username, password } = {}, { _sharedData = true } = {}) {
    username = username || this.credentials.username
    password = password || this.credentials.password

    // Get CSRFToken from cookie before login
    let value
    await this.request('/', { resolveWithFullResponse: true }).then(res => {
      const pattern = new RegExp(/(csrf_token":")\w+/)
      const matches = res.toJSON().body.match(pattern)
      value = matches[0].substring(13)
    })

    // Provide CSRFToken for login or challenge request
    this.request = this.request.defaults({
      headers: { 'X-CSRFToken': value }
    })

    // Login
    const res = await this.request.post('/accounts/login/ajax/', {
      resolveWithFullResponse: true,
      form: { username, password }
    })

    if (!res.headers['set-cookie']) {
      throw new Error('No cookie')
    }
    const cookies = res.headers['set-cookie'].map(Cookie.parse)

    // Get CSRFToken after successful login
    const { value: csrftoken } = cookies
      .find(({ key }) => key === 'csrftoken')
      .toJSON()

    // Provide CSRFToken to request
    this.request = this.request.defaults({
      headers: { 'X-CSRFToken': csrftoken }
    })
    this.credentials = {
      username,
      password,
      // Add cookies to credentials
      cookies: cookies.map(cookie => cookie.toJSON())
    }

    // Provide _sharedData
    if (_sharedData) {
      this._sharedData = await this._getSharedData()
    }

    return res.body
  }

  async _getSharedData(url = '/') {
    return this.request(url)
      .then(
        html => html.split('window._sharedData = ')[1].split(';</script>')[0]
      )
      .then(_sharedData => JSON.parse(_sharedData))
  }

  async _getGis(path) {
    const { rhx_gis } = this._sharedData || (await this._getSharedData(path))

    return crypto
      .createHash('md5')
      .update(`${rhx_gis}:${path}`)
      .digest('hex')
  }

  async logout() {
    return this.request('/accounts/logout/ajax/')
  }

  // https://github.com/jlobos/instagram-web-api/issues/23
  async getHome() {
    return this.request('/?__a=1').then(data => data.graphql.user)
  }

  async getUserByUsername({ username }) {
    return this.request({
      uri: `/${username}/?__a=1`,
      headers: {
        referer: baseUrl + '/' + username + '/',
        'x-instagram-gis': await this._getGis(`/${username}/`)
      }
    }).then(data => data.graphql.user)
  }

  async getStoryReelFeed({ onlyStories = false } = {}) {
    return this.request('/graphql/query/', {
      qs: {
        query_hash: '60b755363b5c230111347a7a4e242001',
        variables: JSON.stringify({
          only_stories: onlyStories
        })
      }
    })
      .then(data => data.data.user.feed_reels_tray.edge_reels_tray_to_reel)
      .then(edge_reels_tray_to_reel => edge_reels_tray_to_reel.edges)
      .then(edges => edges.map(edge => edge.node))
  }

  async getStoryReels({
    reelIds = [],
    tagNames = [],
    locationIds = [],
    precomposedOverlay = false
  } = {}) {
    return this.request('/graphql/query/', {
      qs: {
        query_hash: '297c491471fff978fa2ab83c0673a618',
        variables: JSON.stringify({
          reel_ids: reelIds,
          tag_names: tagNames,
          location_ids: locationIds,
          precomposed_overlay: precomposedOverlay
        })
      }
    }).then(data => data.data.reels_media)
  }

  async getUserIdPhotos({ id, first = 12, after = '' } = {}) {
    return this.request('/graphql/query/', {
      qs: {
        query_hash: '6305d415e36c0a5f0abb6daba312f2dd',
        variables: JSON.stringify({
          id,
          first,
          after
        })
      }
    }).then(data => data.data)
  }

  async getPhotosByHashtag({ hashtag, first = 12, after = '' } = {}) {
    return this.request('/graphql/query/', {
      qs: {
        query_hash: 'ded47faa9a1aaded10161a2ff32abb6b',
        variables: JSON.stringify({
          tag_name: hashtag,
          first,
          after
        })
      }
    }).then(data => data.data)
  }

  async getPhotosByUsername({ username, first, after }) {
    const user = await this.getUserByUsername({ username })
    return this.getUserIdPhotos({ id: user.id, first, after })
  }

  async getStoryItemsByUsername({ username }) {
    const user = await this.getUserByUsername({ username })
    return this.getStoryItemsByReel({ reelId: user.id })
  }

  async getStoryItemsByHashtag({ hashtag }) {
    const reels = await this.getStoryReels({ tagNames: [hashtag] })
    if (reels.length === 0) return []
    return reels[0].items
  }

  async getStoryItemsByLocation({ locationId }) {
    const reels = await this.getStoryReels({ locationIds: [locationId] })
    if (reels.length === 0) return []
    return reels[0].items
  }

  async getStoryItemsByReel({ reelId }) {
    const reels = await this.getStoryReels({ reelIds: [reelId] })
    if (reels.length === 0) return []
    return reels[0].items
  }

  async markStoryItemAsSeen({
    reelMediaId,
    reelMediaOwnerId,
    reelId,
    reelMediaTakenAt,
    viewSeenAt
  }) {
    return this.request.post('/stories/reel/seen', {
      form: {
        reelMediaId,
        reelMediaOwnerId,
        reelId,
        reelMediaTakenAt,
        viewSeenAt
      }
    })
  }

  async _getFollowData({ fieldName, queryHash, variables }) {
    return this.request('/graphql/query/', {
      qs: {
        query_hash: queryHash,
        variables: JSON.stringify(variables)
      }
    })
      .then(data => data.data.user[fieldName])
      .then(({ count, page_info, edges }) => ({
        count,
        page_info,
        data: edges.map(edge => edge.node)
      }))
  }

  async getFollowers({ userId, first = 20, after }) {
    return this._getFollowData({
      fieldName: 'edge_followed_by',
      queryHash: '37479f2b8209594dde7facb0d904896a',
      variables: {
        id: userId,
        first,
        after
      }
    })
  }

  async getFollowings({ userId, first = 20, after }) {
    return this._getFollowData({
      fieldName: 'edge_follow',
      queryHash: '58712303d941c6855d4e888c5f0cd22f',
      variables: {
        id: userId,
        first,
        after
      }
    })
  }

  async getActivity() {
    return this.request('/accounts/activity/?__a=1').then(
      data => data.graphql.user
    )
  }

  async getProfile() {
    return this.request('/accounts/edit/?__a=1').then(data => data.form_data)
  }

  async updateProfile({
    name = '',
    email = '',
    username,
    phoneNumber = '',
    gender,
    biography = '',
    website = '',
    similarAccountSuggestions = true
  }) {
    return this.request.post('/accounts/edit/', {
      form: {
        first_name: name,
        email,
        username: username || this.credentials.username,
        phone_number: phoneNumber,
        gender,
        biography,
        external_url: website,
        chaining_enabled: similarAccountSuggestions
      }
    })
  }

  async changeProfilePhoto({ photo }) {
    return this.request.post('/accounts/web_change_profile_picture/', {
      formData: {
        profile_pic: isUrl(photo) ? request(photo) : fs.createReadStream(photo)
      }
    })
  }

  async deleteMedia({ mediaId }) {
    return this.request.post(`/create/${mediaId}/delete/`)
  }

  async _uploadPhoto({ photo }) {
    return this.request.post('/create/upload/photo/', {
      formData: {
        upload_id: Date.now().toString(),
        photo: isUrl(photo) ? request(photo) : fs.createReadStream(photo),
        media_type: '1'
      }
    })
  }

  async uploadStory({ photo, caption = '' }) {
    return this._uploadPhoto({ photo }).then(({ upload_id }) =>
      this.request.post('/create/configure_to_story/', {
        form: { upload_id, caption }
      })
    )
  }

  async uploadPhoto({ photo, caption = '' }) {
    return this._uploadPhoto({ photo }).then(({ upload_id }) =>
      this.request.post('/create/configure/', {
        form: { upload_id, caption }
      })
    )
  }

  async getMediaFeedByLocation({ locationId }) {
    return this.request(`/explore/locations/${locationId}/?__a=1`).then(
      data => data.graphql.location
    )
  }

  async getMediaFeedByHashtag({ hashtag }) {
    return this.request(`/explore/tags/${hashtag}/?__a=1`).then(
      data => data.graphql.hashtag
    )
  }

  async locationSearch({ query, latitude, longitude }) {
    return this.request('/location_search/', {
      qs: { search_query: query, latitude, longitude }
    }).then(data => data.venues)
  }

  async getMediaByShortcode({ shortcode }) {
    return this.request(`/p/${shortcode}/?__a=1`).then(
      data => data.graphql.shortcode_media
    )
  }

  async addComment({ mediaId, text, replyToCommentId }) {
    return this.request.post(`/web/comments/${mediaId}/add/`, {
      form: { comment_text: text, replied_to_comment_id: replyToCommentId }
    })
  }

  async deleteComment({ mediaId, commentId }) {
    return this.request.post(`/web/comments/${mediaId}/delete/${commentId}/`)
  }

  async getChallenge({ challengeUrl }) {
    return this.request(`${challengeUrl}?__a=1`)
  }

  async _navigateChallenge({ challengeUrl, endpoint, form }) {
    const url = endpoint
      ? challengeUrl.replace('/challenge/', `/challenge/${endpoint}/`)
      : challengeUrl
    return this.request.post(url, {
      headers: {
        Referer: `${baseUrl}${challengeUrl}`
      },
      form
    })
  }

  async updateChallenge({ challengeUrl, choice, securityCode }) {
    const form = securityCode ? { security_code: securityCode } : { choice }

    return this._navigateChallenge({
      challengeUrl,
      form
    })
  }

  async resetChallenge({ challengeUrl }) {
    return this._navigateChallenge({
      challengeUrl,
      endpoint: 'reset'
    })
  }

  async replayChallenge({ challengeUrl }) {
    return this._navigateChallenge({
      challengeUrl,
      endpoint: 'replay'
    })
  }

  async approve({ userId }) {
    return this.request.post(`/web/friendships/${userId}/approve/`)
  }

  async ignore({ userId }) {
    return this.request.post(`/web/friendships/${userId}/ignore/`)
  }

  async follow({ userId }) {
    return this.request.post(`/web/friendships/${userId}/follow/`)
  }

  async unfollow({ userId }) {
    return this.request.post(`/web/friendships/${userId}/unfollow/`)
  }

  async block({ userId }) {
    return this.request.post(`/web/friendships/${userId}/block/`)
  }

  async unblock({ userId }) {
    return this.request.post(`/web/friendships/${userId}/unblock/`)
  }

  async like({ mediaId }) {
    return this.request.post(`/web/likes/${mediaId}/like/`)
  }

  async unlike({ mediaId }) {
    return this.request.post(`/web/likes/${mediaId}/unlike/`)
  }

  async save({ mediaId }) {
    return this.request.post(`/web/save/${mediaId}/save/`)
  }

  async unsave({ mediaId }) {
    return this.request.post(`/web/save/${mediaId}/unsave/`)
  }

  async search({ query, context = 'blended' }) {
    return this.request('/web/search/topsearch/', { qs: { query, context } })
  }

  async _getPosts({ userId, perPage = 12, nextPageToken }) {
    const variables = JSON.stringify({
      id: userId,
      first: perPage,
      after: nextPageToken
    })
    const options = {
      qs: {
        query_hash: '42323d64886122307be10013ad2dcc44',
        variables
      }
    }

    return this.request
      .get('/graphql/query/', options)
      .then(response => response.data.user)
  }
}

module.exports = Instagram
