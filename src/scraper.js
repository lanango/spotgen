/* global jQuery:true */
/* exported jQuery */

var http = require('./http')
var util = require('./util')
var $ = require('jquery')
jQuery = $

/**
 * Create a web scraper.
 * @constructor
 * @param {string} uri - The URI of the webpage to scrape.
 */
function WebScraper (uri, parser) {
  this.uri = uri

  this.parser = parser
}

/**
 * Clean up a string.
 * @return {string} A new string.
 */
WebScraper.prototype.trim = function (str) {
  str = str || ''
  str = str.trim()
  str = str.replace(/[\s]+/g, ' ')
  str = util.toAscii(str)
  return str
}

/**
 * Create a queue of tracks.
 * @param {string} result - A newline-separated list of tracks.
 * @return {Promise | Queue} A queue of results.
 */
WebScraper.prototype.createQueue = function (result) {
  var generator = this.parser.parse(result)
  return generator.dispatch()
}

/**
 * Dispatch entry.
 * @return {Promise | Queue} A queue of results.
 */
WebScraper.prototype.dispatch = function () {
  var self = this
  console.log(this.uri)
  return this.scrape(this.uri).then(function (result) {
    console.log(result)
    return self.createQueue(result)
  })
}

/**
 * Scrape a Last.fm tracklist.
 * @param {string} uri - The URI of the webpage to scrape.
 * @return {Promise | string} A newline-separated list of tracks.
 */
WebScraper.prototype.lastfm = function (uri) {
  var self = this
  return http(uri).then(function (data) {
    var result = ''
    var html = $($.parseHTML(data))
    if (uri.match(/\/\+tracks/gi)) {
      // tracks by a single artist
      var artist = self.trim(html.find('h1.header-title').text())
      html.find('td.chartlist-name').each(function () {
        result += artist + ' - ' + self.trim($(this).text()) + '\n'
      })
    } else if (uri.match(/\/\+similar/gi)) {
      // similar artists
      html.find('h3.big-artist-list-title').each(function () {
        result += '#top ' + self.trim($(this).text()) + '\n'
      })
    } else if (uri.match(/\/artists/gi)) {
      // list of artists
      html.find('td.chartlist-name').each(function () {
        result += '#top ' + self.trim($(this).text()) + '\n'
      })
    } else if (uri.match(/\/albums/gi)) {
      // list of albums
      html.find('td.chartlist-name').each(function () {
        result += '#album ' + self.trim($(this).text()) + '\n'
      })
    } else {
      // list of tracks by various artists
      html.find('td.chartlist-name').each(function () {
        result += self.trim($(this).text()) + '\n'
      })
    }
    return result.trim()
  })
}

/**
 * Scrape a Rate Your Music chart.
 * @param {string} uri - The URI of the webpage to scrape.
 * @return {Promise | string} A newline-separated list of albums.
 */
WebScraper.prototype.rym = function (uri) {
  var self = this
  return http(uri).then(function (data) {
    console.log(data)
    var result = ''
    var html = $($.parseHTML(data))
    // https://rateyourmusic.com/charts/top/album/2016
    html.find('div.chart_details').each(function () {
      var artist = self.trim($(this).find('a.artist').text())
      var album = self.trim($(this).find('a.album').text())
      result += '#album ' + artist + ' - ' + album + '\n'
    })
    return result.trim()
  })
}

/**
 * Scrape a web page.
 * @param {string} uri - The URI of the webpage to scrape.
 * @return {Promise | string} A generator string.
 */
WebScraper.prototype.scrape = function (uri) {
  if (uri.match(/rateyourmusic.com/gi)) {
    return this.rym(uri)
  } else {
    return this.lastfm(uri)
  }
}

module.exports = WebScraper
