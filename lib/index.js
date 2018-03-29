// Native
const fs = require('fs')

// Packages
const request = require('request-promise-native')
const { Cookie } = require('tough-cookie')
const isUrl = require('is-url')
const useragentFromSeed = require('useragent-from-seed')

const baseUrl = 'https://www.instagram.com'

class Instagram {
  constructor(
    { username, password, cookies, cookieStore },
    { language, proxy } = {}
  ) {
    this.credentials = {
      username,
      password,
      cookies
    }

    const jar = request.jar(cookieStore)
    let csrftoken

    if (cookies) {
      cookies.forEach(cookie => jar.setCookie(Cookie.fromJSON(cookie), baseUrl))
      csrftoken = cookies.find(({ key }) => key === 'csrftoken').value
    }

    const userAgent = useragentFromSeed(username)

    this.request = request.defaults({
      baseUrl,
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': language || 'en-US',
        'X-Instagram-AJAX': 1,
        'X-CSRFToken': csrftoken,
        'X-Requested-With': 'XMLHttpRequest',
        Referer: baseUrl
      },
      proxy,
      json: true,
      jar
    })
  }

  async login({ username, password } = {}) {
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

    return res.body
  }

  logout() {
    return this.request('/accounts/logout/ajax/')
  }

  getHome() {
    return this.request('/?__a=1').then(data => data.graphql.user)
  }

  getUserByUsername({ username }) {
    return this.request(`/${username}/?__a=1`).then(data => data.graphql.user)
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
}

module.exports = Instagram
