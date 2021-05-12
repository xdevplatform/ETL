import dotenv from 'dotenv'
dotenv.config()
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet'
import needle from 'needle'

// Setup access to Twitter and Google APIs using env variables
const token = process.env.TW_BEARER_TOKEN
if (!token) {
  terminate(
    'Config mismatch. Expected TW_BEARER_TOKEN environment variable to contain a Twitter API token. Found undefined',
  )
}

const GOOGLE_CREDENTIALS = require('../client_secret.json')
const SEARCH_API_URL = 'https://api.twitter.com/2/tweets/search/stream'
const RULES_API_URL = `${SEARCH_API_URL}/rules`
const auth_headers = {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-type': 'application/json',
  },
  timeout: 20000,
}

async function getGoogleDoc() {
  if (!process.env.TW_GOOGLE_DOC_ID) {
    terminate(
      'Config mismatch. Expecting TW_GOOGLE_DOC_ID environment variable to contain a Google Spreadsheet id. Found undefined',
    )
    return
  }
  const doc = new GoogleSpreadsheet(process.env.TW_GOOGLE_DOC_ID)
  await doc.useServiceAccountAuth(GOOGLE_CREDENTIALS)
  await doc.loadInfo()
  return doc
}

// Sets up a rule based filter on the search endpoint.
// It uses a company name and a hashtag from the environment and adds a rule to the search.
async function setupRules() {
  const search_term = process.env.TW_TERM
  if (!search_term) {
    terminate('Config mismatch. Expecting TW_TERM environment variable to contain name of company')
  }
  const search_hashtag = process.env.TW_HASHTAG
  if (!search_hashtag) {
    terminate(
      'Config mismatch. Expecting TW_HASHTAG environment variable to contain a campaign hashtag',
    )
  }
  const filter_rule = `(${search_term} OR #${search_hashtag}) has:links -is:retweet`

  // Only add this filter rule if it is not already defined.
  return needle('get', RULES_API_URL, {}, auth_headers).then(async (res) => {
    if (
      res.body &&
      (!res.body.data || !res.body.data.some((rule: Rule) => rule.value === filter_rule))
    ) {
      await addRule(filter_rule)
    }
    console.log(
      '\x1b[36m%s\x1b[0m',
      `Setting filter to search for original tweets containing ${search_term} or #${search_hashtag} with links`,
    )
  })
}

// Transform a tweet's data from the stream into a Google Spreadsheet row
// Add the transformed data as a new row in the sheet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function storeTweetInSheet(sheet: GoogleSpreadsheetWorksheet, data: any) {
  if (!data) return
  try {
    const json = JSON.parse(data)
    const { id, created_at, text } = json.data
    const handle = json.includes.users[0].username
    sheet.addRow([`https://twitter.com/${handle}/status/${id}`, handle, created_at, text])
  } catch (err) {
    // No need to do anything
  }
}

// Listen to a stream of tweets from Twitter's API
function handleTweets(sheet: GoogleSpreadsheetWorksheet) {
  // Open a stream with the tweet data we are interested in
  const extraFields = 'tweet.fields=created_at&expansions=author_id&user.fields=created_at'
  const stream = needle.get(`${SEARCH_API_URL}?${extraFields}`, auth_headers)

  // As tweets stream in - transform and store them
  stream
    .on('data', (data) => storeTweetInSheet(sheet, data))
    .on('err', (error) => {
      terminate(error.code)
    })
  return stream
}

// Start the program
(async () => {
  await setupRules()
  const doc = await getGoogleDoc()
  if (!doc) {
    terminate('Could not connect to Google Document')
    return
  }
  const sheet = doc.sheetsByIndex[0]
  handleTweets(sheet)
})()

// Helper function to print an error message and terminate
function terminate(text: string) {
  console.error(text)
  process.exit(1)
}

// Helper function to add a rule to the stream
async function addRule(filter_rule: string) {
  const filter = {
    add: [
      {
        value: filter_rule,
      },
    ],
  }
  return needle('post', RULES_API_URL, filter, auth_headers)
  .then().catch((err) => terminate(err.message))
}

export type Rule = {
  id: string
  value: string
}
