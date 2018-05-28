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
    const { value: csrftoken } =
      jar.getCookies(baseUrl).find(({ key }) => key === 'csrftoken') || {}

    const userAgent = useragentFromSeed(username)
    if (requestOptions === undefined) {
      requestOptions = {}
    }
    requestOptions.baseUrl = baseUrl
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
    const { value } = await this.request('/', { resolveWithFullResponse: true })
      .then(res => res.headers['set-cookie'].map(Cookie.parse))
      .then(res => res.find(cookie => cookie.key === 'csrftoken'))
      .then(res => res.toJSON())

    // Provide CSRFToken for login or challenge request
    this.request = this.request.defaults({
      headers: { 'X-CSRFToken': value }
    })

    // Login
    const res = await this.request.post('/accounts/login/ajax/', {
      resolveWithFullResponse: true,
      form: { username, password }
    })

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

  _getSharedData(url = '/') {
    return this.request(url)
      .then(html => /window._sharedData = (.*);/.exec(html)[1])
      .then(_sharedData => JSON.parse(_sharedData))
  }

  async _getGis(path) {
    const { rhx_gis } = this._sharedData || (await this._getSharedData(path))

    return crypto
      .createHash('md5')
      .update(`${rhx_gis}:${path}`)
      .digest('hex')
  }

  logout() {
    return this.request('/accounts/logout/ajax/')
  }

  // https://github.com/jlobos/instagram-web-api/issues/23
  getHome() {
    return this.request('/?__a=1').then(data => data.graphql.user)
  }

  async getUserByUsername({ username, takePostPages = 0, postsPerPage = 12 }) {
    console.log('request')
    const result = await this.request({
      uri: `/${username}/?__a=1`,
      headers: {
        'x-instagram-gis': await this._getGis(`/${username}/`)
      }
    }).then(data => data.graphql.user)
    if (postsPerPage > 50) {
      postsPerPage = 50
    }
    if (postsPerPage < 12) {
      postsPerPage = 12
    }
    const needMorePosts = takePostPages > 0 || postsPerPage > 12
    const needToReturnCount = takePostPages * postsPerPage
    if (
      needMorePosts &&
      result.edge_owner_to_timeline_media.page_info.has_next_page === true
    ) {
      // We've decided, that we need more posts
      let has_next_page = true
      let nextPageToken =
        result.edge_owner_to_timeline_media.page_info.end_cursor
      const userId = result.id
      const infiniteLoop = true
      while (infiniteLoop) {
        if (has_next_page === false) {
          break
        }
        if (
          result.edge_owner_to_timeline_media.edges.length >= needToReturnCount
        ) {
          break
        }

        let perPage = postsPerPage

        if (result.edge_owner_to_timeline_media.edges.length < postsPerPage) {
          const fillFirstPage =
            postsPerPage - result.edge_owner_to_timeline_media.edges.length
          perPage = fillFirstPage // We have to fill first page posts count to postsPerPage
        }
        const page = await this._getPosts({
          userId,
          perPage,
          nextPageToken
        })

        has_next_page =
          page.edge_owner_to_timeline_media.page_info.has_next_page
        nextPageToken = page.edge_owner_to_timeline_media.page_info.end_cursor
        result.edge_owner_to_timeline_media.edges = [
          ...result.edge_owner_to_timeline_media.edges,
          ...page.edge_owner_to_timeline_media.edges
        ]
      }
      result.edge_owner_to_timeline_media.page_info.end_cursor = nextPageToken // We're giving possibility to use _getPosts() after all
    }
    return result
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

  _getFollowData({ fieldName, queryHash, variables }) {
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

  getFollowers({ userId, first = 20, after }) {
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

  getFollowings({ userId, first = 20, after }) {
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

  getActivity() {
    return this.request('/accounts/activity/?__a=1').then(
      data => data.graphql.user
    )
  }

  getProfile() {
    return this.request('/accounts/edit/?__a=1').then(data => data.form_data)
  }

  updateProfile({
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
        username: this.credentials.username || username,
        phone_number: phoneNumber,
        gender,
        biography,
        external_url: website,
        chaining_enabled: similarAccountSuggestions
      }
    })
  }

  changeProfilePhoto({ photo }) {
    return this.request.post('/accounts/web_change_profile_picture/', {
      formData: {
        profile_pic: isUrl(photo) ? request(photo) : fs.createReadStream(photo)
      }
    })
  }

  deleteMedia({ mediaId }) {
    return this.request.post(`/create/${mediaId}/delete/`)
  }

  _uploadPhoto({ photo }) {
    return this.request.post('/create/upload/photo/', {
      formData: {
        upload_id: Date.now().toString(),
        photo: isUrl(photo) ? request(photo) : fs.createReadStream(photo),
        media_type: '1'
      }
    })
  }

  uploadStory({ photo, caption = '' }) {
    return this._uploadPhoto({ photo }).then(({ upload_id }) =>
      this.request.post('/create/configure_to_story/', {
        form: { upload_id, caption }
      })
    )
  }

  uploadPhoto({ photo, caption = '' }) {
    return this._uploadPhoto({ photo }).then(({ upload_id }) =>
      this.request.post('/create/configure/', {
        form: { upload_id, caption }
      })
    )
  }

  getMediaFeedByLocation({ locationId }) {
    return this.request(`/explore/locations/${locationId}/?__a=1`).then(
      data => data.graphql.location
    )
  }

  getMediaFeedByHashtag({ hashtag }) {
    return this.request(`/explore/tags/${hashtag}/?__a=1`).then(
      data => data.graphql.hashtag
    )
  }

  locationSearch({ query, latitude, longitude }) {
    return this.request('/location_search/', {
      qs: { search_query: query, latitude, longitude }
    }).then(data => data.venues)
  }

  getMediaByShortcode({ shortcode }) {
    return this.request(`/p/${shortcode}/?__a=1`).then(
      data => data.graphql.shortcode_media
    )
  }

  addComment({ mediaId, text }) {
    return this.request.post(`/web/comments/${mediaId}/add/`, {
      form: { comment_text: text }
    })
  }

  deleteComment({ mediaId, commentId }) {
    return this.request.post(`/web/comments/${mediaId}/delete/${commentId}/`)
  }

  getChallenge({ challengeUrl }) {
    return this.request(`${challengeUrl}?__a=1`)
  }

  _navigateChallenge({ challengeUrl, endpoint, form }) {
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

  updateChallenge({ challengeUrl, choice, securityCode }) {
    const form = securityCode ? { security_code: securityCode } : { choice }

    return this._navigateChallenge({
      challengeUrl,
      form
    })
  }

  resetChallenge({ challengeUrl }) {
    return this._navigateChallenge({
      challengeUrl,
      endpoint: 'reset'
    })
  }

  replayChallenge({ challengeUrl }) {
    return this._navigateChallenge({
      challengeUrl,
      endpoint: 'replay'
    })
  }

  approve({ userId }) {
    return this.request.post(`/web/friendships/${userId}/approve/`)
  }

  ignore({ userId }) {
    return this.request.post(`/web/friendships/${userId}/ignore/`)
  }

  follow({ userId }) {
    return this.request.post(`/web/friendships/${userId}/follow/`)
  }

  unfollow({ userId }) {
    return this.request.post(`/web/friendships/${userId}/unfollow/`)
  }

  block({ userId }) {
    return this.request.post(`/web/friendships/${userId}/block/`)
  }

  unblock({ userId }) {
    return this.request.post(`/web/friendships/${userId}/unblock/`)
  }

  like({ mediaId }) {
    return this.request.post(`/web/likes/${mediaId}/like/`)
  }

  unlike({ mediaId }) {
    return this.request.post(`/web/likes/${mediaId}/unlike/`)
  }

  save({ mediaId }) {
    return this.request.post(`/web/save/${mediaId}/save/`)
  }

  unsave({ mediaId }) {
    return this.request.post(`/web/save/${mediaId}/unsave/`)
  }

  search({ query, context = 'blended' }) {
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
