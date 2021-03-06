var Queue = require('./queue')
var SpotifyRequestHandler = require('./spotify')
var Track = require('./track')

/**
 * Create album entry.
 * @constructor
 * @param {SpotifyRequestHandler} spotify - Spotify request handler.
 * @param {string} entry - The album to search for.
 * @param {string} [id] - The Spotify ID, if known.
 * @param {string} [limit] - The number of tracks to fetch.
 */
function Album (spotify, entry, id, limit) {
  /**
   * Entry string.
   */
  this.entry = ''

  /**
   * Whether to fetch tracks.
   */
  this.fetchTracks = true

  /**
   * Spotify ID.
   */
  this.id = ''

  /**
   * Number of albums to fetch.
   */
  this.limit = null

  /**
   * The album name.
   */
  this.name = ''

  /**
   * The album popularity.
   * @return {string} - The album popularity.
   */
  this.popularity = null

  /**
   * Spotify request handler.
   */
  this.spotify = null

  /**
   * Album tracks.
   */
  this.tracks = []

  /**
   * Spotify URI
   * (a string on the form `spotify:album:xxxxxxxxxxxxxxxxxxxxxx`).
   */
  this.uri = ''

  this.entry = entry.trim()
  this.id = id
  this.limit = limit
  this.name = entry
  this.spotify = spotify || new SpotifyRequestHandler()
  this.uri = this.id ? ('spotify:album:' + this.id) : this.uri
}

/**
 * Clone a JSON response.
 * @param {Object} response - The response.
 */
Album.prototype.clone = function (response) {
  for (var prop in response) {
    if (response.hasOwnProperty(prop)) {
      this[prop] = response[prop] || this[prop]
    }
  }
  if (response &&
      response.tracks &&
      response.tracks.items) {
    this.tracks = response.tracks.items
  }
}

/**
 * Create a queue of tracks.
 * @param {JSON} response - A JSON response object.
 * @return {Promise | Queue} A queue of tracks.
 */
Album.prototype.createQueue = function () {
  var self = this
  var tracks = this.tracks.map(function (item) {
    var track = new Track(self.spotify, self.entry)
    track.clone(item)
    track.album = self.name
    return track
  })
  var queue = new Queue(tracks)
  if (self.limit) {
    queue = queue.slice(0, self.limit)
  }
  return queue
}

/**
 * Dispatch entry.
 * @return {Promise | Queue} A queue of tracks.
 */
Album.prototype.dispatch = function () {
  var self = this
  if (this.fetchTracks) {
    return this.searchForAlbum().then(function () {
      return self.fetchAlbum()
    }).then(function () {
      return self.createQueue()
    })
  } else {
    return this.searchForAlbum()
  }
}

/**
 * Fetch album metadata.
 * @return {Promise | JSON} A JSON response.
 */
Album.prototype.fetchAlbum = function (id) {
  id = id || this.id
  var self = this
  if (Number.isInteger(this.popularity)) {
    return Promise.resolve(this)
  } else {
    return this.spotify.getAlbum(id).then(function (response) {
      self.clone(response)
      return self
    })
  }
}

/**
 * Get album popularity.
 * @return {Promise | integer} The track popularity.
 */
Album.prototype.getPopularity = function () {
  var self = this
  if (Number.isInteger(this.popularity)) {
    return Promise.resolve(this.popularity)
  } else {
    return self.fetchAlbum().then(function () {
      return self.popularity
    })
  }
}

/**
 * Search for album if not known.
 * @return {Promise | JSON} A JSON response, or `null` if not found.
 */
Album.prototype.searchForAlbum = function () {
  var self = this
  if (this.id) {
    return Promise.resolve(this)
  } else {
    return this.spotify.searchForAlbum(this.entry).then(function (response) {
      if (response &&
          response.albums &&
          response.albums.items &&
          response.albums.items[0]) {
        response = response.albums.items[0]
        self.clone(response)
        return Promise.resolve(self)
      } else {
        return Promise.reject(response)
      }
    }).catch(function () {
      if (self.entry.match(/^[0-9a-z]+$/i)) {
        return self.fetchAlbum(self.entry)
      } else {
        console.log('COULD NOT FIND ' + self.entry)
        return Promise.reject(null)
      }
    })
  }
}

module.exports = Album
