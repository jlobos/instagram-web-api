// Native
const fs = require('fs')

// Packages
const request = require('request-promise-native')
const { Cookie } = require('tough-cookie')
const isUrl = require('is-url')

const baseUrl = 'https://www.instagram.com'
const userAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'

class Instagram {
  constructor({ username, password, cookies }, { language, proxy } = {}) {
    this.credentials = {
      username,
      password,
      cookies
    }

    const jar = request.jar()
    let csrftoken

    if (cookies) {
      cookies.forEach(cookie => jar.setCookie(Cookie.fromJSON(cookie), baseUrl))
      csrftoken = cookies.find(({ key }) => key === 'csrftoken').value
    }

    this.request = request.defaults({
      baseUrl,
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': language || 'en-US',
        'X-Instagram-AJAX': 1,
        'X-CSRFToken': csrftoken,
        Referer: baseUrl
      },
      proxy,
      timeout: 30000,
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

    // Login
    const cookies = await this.request
      .post('/accounts/login/ajax/', {
        headers: { 'X-CSRFToken': value },
        resolveWithFullResponse: true,
        form: { username, password }
      })
      .then(res => res.headers['set-cookie'].map(Cookie.parse))

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

    return this.credentials
  }

  logout() {
    return this.request('/accounts/logout/ajax/')
  }

  getHome() {
    return this.request('/?__a=1')
  }

  getUserByUsername({ username }) {
    return this.request(`/${username}/?__a=1`)
  }

  getActivity() {
    return this.request('/accounts/activity/?__a=1')
  }

  getProfile() {
    return this.request('/accounts/edit/?__a=1')
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
    return this.request(`/explore/locations/${locationId}/?__a=1`)
  }

  getMediaFeedByHashtag({ hashtag }) {
    return this.request(`/explore/tags/${hashtag}/?__a=1`)
  }

  locationSearch({ query, latitude, longitude }) {
    return this.request('/location_search/', {
      qs: { search_query: query, latitude, longitude }
    })
  }

  getMediaByShortcode({ shortcode }) {
    return this.request(`/p/${shortcode}/?__a=1`)
  }

  addComment({ mediaId, text }) {
    return this.request.post(`/web/comments/${mediaId}/add/`, {
      form: { comment_text: text }
    })
  }

  deleteComment({ mediaId, commentId }) {
    return this.request.post(`/web/comments/${mediaId}/delete/${commentId}/`)
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
